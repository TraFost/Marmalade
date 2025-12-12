import { AppError } from "../libs/helper/error.helper";
import { VoiceSessionRepository } from "../repositories/voice-session.repository";
import { ConversationStateRepository } from "../repositories/conversation-state.repository";
import { MessageRepository } from "../repositories/message.repository";
import { ConversationService } from "./conversation.service";
import { db } from "../libs/db/db.lib";
import { ScreeningRepository } from "../repositories/screening.repository";
import type { ScreeningSummary } from "shared/src/types/screening.type";

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
			const screeningSummary = latestScreening
				? this.buildScreeningSummary(latestScreening)
				: undefined;

			await this.ensureConversationState(userId, tx);
			if (screeningSummary) {
				await this.states.updateByUserId(
					userId,
					{ preferences: { screeningSummary } },
					tx
				);
			}

			return this.sessions.create(userId, tx);
		});
	}

	private buildScreeningSummary(screening: {
		gender?: string | null;
		ageRange?: string | null;
		sleepQuality?: string | null;
		happinessScore?: number | null;
		goals?: string[] | null;
		riskLevel?: string | null;
		dassDepression?: number | null;
		dassAnxiety?: number | null;
		dassStress?: number | null;
		dassDepressionLevel?: string | null;
		dassAnxietyLevel?: string | null;
		dassStressLevel?: string | null;
	}): ScreeningSummary {
		return {
			riskLevel: (screening.riskLevel as any) ?? null,
			dass: {
				depressionScore: screening.dassDepression ?? null,
				anxietyScore: screening.dassAnxiety ?? null,
				stressScore: screening.dassStress ?? null,
				depressionLevel: (screening.dassDepressionLevel as any) ?? null,
				anxietyLevel: (screening.dassAnxietyLevel as any) ?? null,
				stressLevel: (screening.dassStressLevel as any) ?? null,
			},
			wellbeing: {
				sleepQuality: (screening.sleepQuality as any) ?? null,
				happinessScore: screening.happinessScore ?? null,
			},
			profile: {
				gender: (screening.gender as any) ?? null,
				ageRange: (screening.ageRange as any) ?? null,
				goals: screening.goals ?? [],
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
			return this.startSession(userId);
		}
		const session = await this.sessions.findById(sessionId);
		if (!session || session.userId !== userId) {
			throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
		}
		return session;
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
