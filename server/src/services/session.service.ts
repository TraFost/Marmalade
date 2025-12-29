import { AppError } from "../libs/helper/error.helper";
import { VoiceSessionRepository } from "../repositories/voice-session.repository";
import { ConversationStateRepository } from "../repositories/conversation-state.repository";
import { MessageRepository } from "../repositories/message.repository";
import { ConversationService } from "./conversation.service";
import { db } from "../libs/db/db.lib";
import { logger } from "../libs/logger";
import { ScreeningRepository } from "../repositories/screening.repository";
import type { StateMappingSignals, UserStateGraph } from "shared";

type DBClient = typeof db;

export class SessionService {
	private sessions = new VoiceSessionRepository();
	private states = new ConversationStateRepository();
	private messages = new MessageRepository();
	private conversations = new ConversationService();
	private screenings = new ScreeningRepository();

	async ensureConversationState(userId: string, client: DBClient = db) {
		const existing = await this.states.getByUserId(userId, client);
		if (existing) return existing;
		return this.states.upsert(
			{ userId, mood: "unknown", riskLevel: 0 },
			client
		);
	}

	async startSession(userId: string) {
		return db.transaction(async (tx) => {
			const latestScreening = await this.screenings.findLatestCompletedByUser(
				userId
			);

			const state = await this.ensureConversationState(userId, tx);
			const existingPrefs =
				state.preferences && typeof state.preferences === "object"
					? (state.preferences as Record<string, unknown>)
					: {};

			if (latestScreening) {
				const derived = this.buildStateMappingSignals(latestScreening);
				const prevSignals =
					existingPrefs.stateMappingSignals &&
					typeof existingPrefs.stateMappingSignals === "object"
						? (existingPrefs.stateMappingSignals as Record<string, unknown>)
						: {};

				const nextSignals: StateMappingSignals = {
					...(prevSignals as any),
					...derived,
					profile: {
						...((prevSignals as any).profile ?? {}),
						...(derived.profile ?? {}),
					},
					dass: {
						...((prevSignals as any).dass ?? {}),
						...(derived.dass ?? {}),
					},
				};

				const prevGraph =
					existingPrefs.userStateGraph &&
					typeof existingPrefs.userStateGraph === "object"
						? (existingPrefs.userStateGraph as any)
						: null;
				const nextGraph: UserStateGraph =
					prevGraph && prevGraph.version === 1
						? prevGraph
						: {
								version: 1,
								updatedAt: new Date().toISOString(),
								baseline: null,
								lastRead: null,
						  };

				const goals = Array.isArray((latestScreening as any).goals)
					? ((latestScreening as any).goals as unknown[]).filter(
							(g) => typeof g === "string" && g.trim().length > 0
					  )
					: [];
				nextGraph.anchors = {
					goals: Array.from(
						new Set([
							...(nextGraph.anchors?.goals ?? []),
							...(goals as string[]),
						])
					),
					lifeAnchors: nextGraph.anchors?.lifeAnchors ?? [],
					values: nextGraph.anchors?.values ?? [],
					rememberedDreams: nextGraph.anchors?.rememberedDreams ?? [],
				};
				nextGraph.updatedAt = new Date().toISOString();

				await this.states.updateByUserId(
					userId,
					{
						preferences: {
							...existingPrefs,
							userStateGraph: nextGraph,
							stateMappingSignals: nextSignals,
						},
					},
					tx
				);
			}

			return this.sessions.create(userId, tx);
		});
	}

	private buildStateMappingSignals(screening: {
		gender?: string | null;
		ageRange?: string | null;
		sleepQuality?: string | null;
		medicationStatus?: string | null;
		happinessScore?: number | null;
		goals?: string[] | null;
		dassDepression?: number | null;
		dassAnxiety?: number | null;
		dassStress?: number | null;
	}): StateMappingSignals {
		return {
			dass: {
				depressionScore: screening.dassDepression ?? null,
				anxietyScore: screening.dassAnxiety ?? null,
				stressScore: screening.dassStress ?? null,
			},
			sleepQuality: screening.sleepQuality ?? null,
			medicationStatus: screening.medicationStatus ?? null,
			happinessScore: screening.happinessScore ?? null,
			profile: {
				gender: screening.gender ?? null,
				ageRange: screening.ageRange ?? null,
			},
		};
	}

	async incrementMessageCount(
		sessionId: string,
		delta = 1,
		client: DBClient = db
	) {
		await this.sessions.incrementMessageCount(sessionId, delta, client);
	}

	async ensureSession(userId: string, sessionId?: string) {
		if (!sessionId) {
			logger.info(
				{ userId, sessionId: null },
				"ensureSession: no sessionId provided - creating new session"
			);
			return this.startSession(userId);
		}

		const isUuid = (value: string) =>
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
				value
			);

		if (isUuid(sessionId)) {
			const session = await this.sessions.findById(sessionId);
			if (!session || session.userId !== userId) {
				logger.info(
					{ userId, sessionId, isUuid: true, resolved: null },
					"ensureSession: UUID provided but not found or mismatched user"
				);
				throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
			}
			logger.info(
				{ userId, sessionId, isUuid: true, resolved: session.id },
				"ensureSession: resolved by UUID"
			);
			return session;
		}

		// Not a UUID - treat as external id
		const existing = await this.sessions.findByExternalId(userId, sessionId);
		if (existing) {
			logger.info(
				{
					userId,
					incomingExternalId: sessionId,
					isUuid: false,
					resolved: existing.id,
				},
				"ensureSession: resolved external id to existing session"
			);
			return existing;
		}

		// Not found - create a new session and persist external id
		logger.info(
			{ userId, incomingExternalId: sessionId, isUuid: false, resolved: null },
			"ensureSession: external id not found - creating new session with external id"
		);
		return db.transaction(async (tx) => {
			const s = await this.sessions.create(userId, tx, sessionId);
			return s;
		});
	}

	async endSession(userId: string, sessionId: string) {
		const session = await this.sessions.findById(sessionId);
		if (!session || session.userId !== userId) {
			throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
		}

		const now = new Date();
		const durationSeconds = session.startedAt
			? Math.max(
					0,
					Math.floor((now.getTime() - session.startedAt.getTime()) / 1000)
			  )
			: null;

		return db.transaction(async (tx) => {
			const messageCount = await this.messages.countBySession(sessionId, tx);

			await this.sessions.endSession(
				sessionId,
				{
					endedAt: now,
					messageCount,
					durationSeconds: durationSeconds ?? undefined,
				},
				tx
			);

			const summaryDoc = await this.conversations.summarizeSession(
				sessionId,
				userId,
				tx
			);

			return { summaryDocId: summaryDoc.id, summary: summaryDoc.content };
		});
	}
}
