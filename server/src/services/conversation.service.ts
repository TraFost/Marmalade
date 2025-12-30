import { desc, eq } from "drizzle-orm";
import {
	MiniBrainClient,
	type MiniBrainResult,
} from "../libs/ai/mini-brain.client";
import { CounselorBrainClient } from "../libs/ai/counselor-brain.client";
import { FirstResponseClient } from "../libs/ai/first-response.client";
import { EmbeddingClient } from "../libs/ai/embedding.client";
import { EmbeddingRepository } from "../repositories/embedding.repository";
import { AppError } from "../libs/helper/error.helper";
import { MessageRepository } from "../repositories/message.repository";
import { ConversationStateRepository } from "../repositories/conversation-state.repository";
import { VoiceSessionRepository } from "../repositories/voice-session.repository";
import { RiskLogRepository } from "../repositories/risk-log.repository";
import { MemoryDocRepository } from "../repositories/memory-doc.repository";
import { messages } from "../libs/db/schemas/messages.schema";
import { getEmitter } from "../libs/events/event-bus";
import { db } from "../libs/db/db.lib";
import { coordinateTurn } from "../libs/ai/agents/turn-coordinator";
import type {
	StateDelta,
	StateMappingSignals,
	TurnResult,
	UserStateGraph,
} from "shared";
import {
	BASE_PERSONA,
	buildMiniFallbackResult,
} from "../libs/ai/prompts/shared.prompt";
import { logger } from "../libs/logger";

type DBClient = typeof db;
const allowedMoods = [
	"unknown",
	"calm",
	"sad",
	"anxious",
	"angry",
	"numb",
	"mixed",
] as const;
type AllowedMood = (typeof allowedMoods)[number];

const EMERGENCY_PACKET = {
	replyText:
		"Hmm, sorry I got lost here. There's a lot to digest. Please repeat what you were saying.",
	voiceMode: "comfort" as const,
};

const normalizeMood = (mood: string): AllowedMood =>
	(allowedMoods as readonly string[]).includes(mood)
		? (mood as AllowedMood)
		: "unknown";

const detectCompanionRequest = (text: string): boolean => {
	const t = text.toLowerCase();
	return (
		t.includes("stay with me") ||
		t.includes("don't leave") ||
		t.includes("please don't go") ||
		t.includes("can you just be here") ||
		t.includes("be with me") ||
		t.includes("i need you") ||
		t.includes("please stay") ||
		t.includes("stay")
	);
};

const CRITICAL_KEYWORDS = [
	"die",
	"kill",
	"hurt",
	"suicide",
	"end it",
	"pain",
	"lost",
	"help",
	"tired",
	"alone",
	"scared",
	"sad",
];

const CONTEXT_KEYWORDS = [
	"remember",
	"yesterday",
	"last time",
	"who am i",
	"advice",
	"suggest",
	"help me",
];

const isGreetingTurn = (text: string): boolean => {
	const t = text.toLowerCase().trim();
	return (
		t === "hi" ||
		t === "hey" ||
		t === "hello" ||
		t === "good morning" ||
		t === "good night" ||
		t === "good evening" ||
		t.startsWith("good morning") ||
		t.startsWith("good night") ||
		t.startsWith("good evening") ||
		t.startsWith("morning") ||
		t.startsWith("evening")
	);
};

const isTrivialTurn = (text: string): boolean => {
	const t = text.toLowerCase().trim();

	if (isEllipsisOnlyTurn(t)) return false;
	if (CRITICAL_KEYWORDS.some((k) => t.includes(k))) return false;
	if (CONTEXT_KEYWORDS.some((k) => t.includes(k))) return false;

	const emotionalTriggers = ["scared", "fake", "pain", "sad", "help", "alone"];
	if (emotionalTriggers.some((k) => t.includes(k))) return false;

	const wordCount = t.split(/\s+/).filter(Boolean).length;
	if (wordCount > 2 || t.length > 12) return false;

	return true;
};

const isEllipsisOnlyTurn = (t: string): boolean => {
	return /^\s*(?:\.{3,}|…+|(?:…\s*){1,})\s*$/.test(t);
};

const nowIso = () => new Date().toISOString();

const asObject = (v: unknown): Record<string, unknown> | null =>
	v && typeof v === "object" && !Array.isArray(v) ? (v as any) : null;

const extractPreferredName = (text: string): string | null => {
	const t = text.trim();
	if (!t) return null;

	const patterns: RegExp[] = [
		/(?:\bmy name is\b|\bcall me\b|\b(?:i am|i'm)\b)\s+([A-Za-z][A-Za-z.'-]{1,24}(?:\s+[A-Za-z][A-Za-z.'-]{1,24}){0,2})/i,
		/(?:\byou can call me\b)\s+([A-Za-z][A-Za-z.'-]{1,24}(?:\s+[A-Za-z][A-Za-z.'-]{1,24}){0,2})/i,
	];

	for (const re of patterns) {
		const m = t.match(re);
		const candidate = m?.[1]?.trim();
		if (!candidate) continue;

		const cleaned = candidate.replace(/["”“.!,?]+$/g, "").trim();
		if (!cleaned) continue;

		const bad = new Set([
			"tired",
			"sad",
			"fine",
			"okay",
			"ok",
			"good",
			"broken",
			"stressed",
			"anxious",
			"depressed",
		]);
		if (bad.has(cleaned.toLowerCase())) continue;

		return cleaned.slice(0, 40);
	}

	return null;
};

const mergePreferencesWithImmediateFacts = (
	prefs: Record<string, unknown>,
	userMessage: string
): Record<string, unknown> => {
	const next = { ...prefs };
	const name = extractPreferredName(userMessage);
	if (name) next.name = name;
	return next;
};

const PSYCHOLOGIST_YES_ANCHOR = "Has seen a psychologist before";
const PSYCHOLOGIST_NO_ANCHOR = "Has not seen a psychologist before";

const extractStateMappingContext = (prefs: Record<string, unknown>) => {
	const signals = asObject(prefs.stateMappingSignals) ?? {};
	const profile = asObject((signals as any).profile) ?? {};
	const dass = asObject((signals as any).dass) ?? {};

	const graph = ensureGraph(prefs.userStateGraph);
	const anchors = graph.anchors ?? {
		goals: [],
		lifeAnchors: [],
		values: [],
		rememberedDreams: [],
	};

	const values = Array.isArray(anchors.values)
		? anchors.values.filter(
				(v) => v !== PSYCHOLOGIST_YES_ANCHOR && v !== PSYCHOLOGIST_NO_ANCHOR
		  )
		: [];

	const hasSeenPsychologist = Array.isArray(anchors.values)
		? anchors.values.includes(PSYCHOLOGIST_YES_ANCHOR)
			? true
			: anchors.values.includes(PSYCHOLOGIST_NO_ANCHOR)
			? false
			: null
		: null;

	return {
		profile: {
			gender: typeof profile.gender === "string" ? profile.gender : null,
			ageRange: typeof profile.ageRange === "string" ? profile.ageRange : null,
		},
		signals: {
			sleepQuality:
				typeof (signals as any).sleepQuality === "string"
					? (signals as any).sleepQuality
					: null,
			medicationStatus:
				typeof (signals as any).medicationStatus === "string"
					? (signals as any).medicationStatus
					: null,
			medicationNotes:
				typeof (signals as any).medicationNotes === "string"
					? (signals as any).medicationNotes
					: null,
			happinessScore:
				typeof (signals as any).happinessScore === "number"
					? (signals as any).happinessScore
					: null,
			willStatus:
				typeof (signals as any).willStatus === "string"
					? (signals as any).willStatus
					: null,
			interactionPreference:
				typeof (signals as any).interactionPreference === "string"
					? (signals as any).interactionPreference
					: null,
			painQualia:
				typeof (signals as any).painQualia === "string"
					? (signals as any).painQualia
					: null,
			unfinishedLoops:
				typeof (signals as any).unfinishedLoops === "string"
					? (signals as any).unfinishedLoops
					: null,
			dass: {
				depressionScore:
					typeof (dass as any).depressionScore === "number"
						? (dass as any).depressionScore
						: null,
				anxietyScore:
					typeof (dass as any).anxietyScore === "number"
						? (dass as any).anxietyScore
						: null,
				stressScore:
					typeof (dass as any).stressScore === "number"
						? (dass as any).stressScore
						: null,
			},
		},
		anchors: {
			goals: Array.isArray(anchors.goals) ? anchors.goals : [],
			lifeAnchors: Array.isArray(anchors.lifeAnchors)
				? anchors.lifeAnchors
				: [],
			values,
			hasSeenPsychologist,
		},
	};
};

const FILLER_PHRASES = [
	"I'm listening... let me just sit with that for a moment.",
	"I hear you... I'm taking a moment to really take that in.",
	"That is something to hold onto... let me reflect.",
] as const;

const ensureGraph = (maybe: unknown): UserStateGraph => {
	const obj = asObject(maybe);
	if (obj && obj.version === 1) return obj as unknown as UserStateGraph;
	return { version: 1, updatedAt: nowIso(), baseline: null, lastRead: null };
};

const MINI_VALIDATION_ERROR_CODES = new Set([
	"INVALID_MINI_RESPONSE_SCHEMA",
	"INVALID_MINI_RESPONSE_JSON",
]);

const isMiniValidationError = (error: unknown): error is AppError =>
	error instanceof AppError &&
	MINI_VALIDATION_ERROR_CODES.has(error.code ?? "");

const buildSystemInstruction = (c: {
	mood: string;
	riskLevel: number;
	mode: "support" | "companion";
	stateDelta: StateDelta;
	languagePlan: any;
	decision: any;
}) =>
	`
    ${BASE_PERSONA}

    # IDENTITY
    You are Marmalade, a persistent witness and emotional companion. 
    You are the second layer of a response. The user's immediate feeling has already been acknowledged.
    
    # YOUR ROLE: THE BRIDGE
    Do NOT acknowledge the user's last sentence (that was done already).
    Instead, provide the "intervention" or the "narrative bridge."
    Focus on: ${c.decision.responseClass}.
    
    # CONTEXTUAL DATA
    Current Mood: ${c.mood}
    Risk Level: ${c.riskLevel}
    Intervention Type: ${c.decision.responseClass}
    Language Style: ${c.languagePlan.rawness} rawness, ${c.languagePlan.sentenceLength} sentences.

    # VOICE-FIRST RULES (FOR ELEVENLABS)
    - No markdown (no **bold**, no # headers).
    - Use commas to guide vocal pacing. 
    - Mirror the user's rawness and slang.
    - If riskLevel is 4: Speak only about safety and grounding.
    
    # CRITICAL RESTRICTION
    "Validate the user's reality.
	If they share a feeling, abstract it (e.g., 'The weight is heavy').
	If they ask a question ('How?'), validate the difficulty of the search (e.g., 'It feels impossible to see the path right now')."
    `.trim();

export class ConversationService {
	private static activeTurns = new Map<string, AbortController>();

	beginTurn(sessionId: string, reason = "new turn started"): AbortController {
		const previous = ConversationService.activeTurns.get(sessionId);
		if (previous && !previous.signal.aborted) {
			try {
				previous.abort(new Error(reason));
			} catch {
				// ignore
			}
		}

		const controller = new AbortController();
		ConversationService.activeTurns.set(sessionId, controller);
		return controller;
	}

	endTurn(sessionId: string, controller: AbortController) {
		if (ConversationService.activeTurns.get(sessionId) === controller) {
			ConversationService.activeTurns.delete(sessionId);
		}
	}

	abortTurn(sessionId: string, reason = "turn cancelled") {
		const existing = ConversationService.activeTurns.get(sessionId);
		if (!existing) return;
		try {
			existing.abort(new Error(reason));
		} catch {
			// ignore
		}
		ConversationService.activeTurns.delete(sessionId);
	}

	private throwIfAborted(signal: AbortSignal | undefined) {
		if (!signal?.aborted) return;
		throw new AppError("Turn aborted", 409, "TURN_ABORTED");
	}

	private miniBrain = new MiniBrainClient();
	private firstResponseBrain = new FirstResponseClient();
	private counselorBrain = new CounselorBrainClient();
	private embeddingClient = new EmbeddingClient();
	private embeddingRepo = new EmbeddingRepository();
	private messages = new MessageRepository();
	private states = new ConversationStateRepository();
	private sessions = new VoiceSessionRepository();
	private riskLogs = new RiskLogRepository();
	private memoryDocs = new MemoryDocRepository();

	async handleUserTurn(
		userId: string,
		sessionId: string,
		userMessage: string
	): Promise<TurnResult> {
		const turnController = this.beginTurn(sessionId);
		const signal = turnController.signal;
		try {
			const session = await this.sessions.findById(sessionId);
			if (!session || session.userId !== userId) {
				throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
			}
			this.throwIfAborted(signal);

			const recent = await this.messages.listRecentBySession(sessionId, 10);
			this.throwIfAborted(signal);
			const conversationState = (await this.states.getByUserId(userId)) ?? {
				userId,
				summary: "",
				mood: "unknown",
				riskLevel: 0,
				baselineDepression: null,
				baselineAnxiety: null,
				baselineStress: null,
				lastThemes: null,
				preferences: null,
			};

			const previousMood = normalizeMood(conversationState.mood);
			const basePrefs = asObject(conversationState.preferences) ?? {};
			const prefs = mergePreferencesWithImmediateFacts(basePrefs, userMessage);
			this.throwIfAborted(signal);
			if (isEllipsisOnlyTurn(userMessage.trim().toLowerCase())) {
				const replyText = "Hey, I'm ready to listen whenever u'r ready to!";
				const mini = buildMiniFallbackResult(userMessage);

				await db.transaction(async (tx) => {
					await this.states.upsert(
						{
							userId,
							summary: conversationState.summary,
							mood: previousMood,
							riskLevel: conversationState.riskLevel,
							lastThemes: conversationState.lastThemes,
							baselineDepression: conversationState.baselineDepression,
							baselineAnxiety: conversationState.baselineAnxiety,
							baselineStress: conversationState.baselineStress,
							preferences: prefs,
						},
						tx
					);

					await this.riskLogs.create(
						{
							userId,
							sessionId,
							riskLevel: mini.riskLevel,
							mood: previousMood,
							themes: mini.themes,
						},
						tx
					);

					await this.sessions.updateMaxRisk(sessionId, mini.riskLevel, tx);
					await this.messages.create(
						{
							userId,
							sessionId,
							role: "assistant",
							content: replyText,
							metadata: { tags: ["ellipsis_short_circuit"] },
							voiceMode: "comfort",
							riskAtTurn: mini.riskLevel,
							themes: mini.themes,
						},
						tx
					);
					await this.sessions.incrementMessageCount(sessionId, 1, tx);
				});

				return {
					replyText,
					voiceMode: "comfort",
					mood: previousMood,
					riskLevel: mini.riskLevel,
				};
			}

			if (isGreetingTurn(userMessage)) {
				const replyText =
					"Hello! I'm here to listen whenever you're ready to share.";
				const mini = buildMiniFallbackResult(userMessage);

				await db.transaction(async (tx) => {
					await this.states.upsert(
						{
							userId,
							summary: conversationState.summary,
							mood: previousMood,
							riskLevel: conversationState.riskLevel,
							lastThemes: conversationState.lastThemes,
							baselineDepression: conversationState.baselineDepression,
							baselineAnxiety: conversationState.baselineAnxiety,
							baselineStress: conversationState.baselineStress,
							preferences: prefs,
						},
						tx
					);

					await this.riskLogs.create(
						{
							userId,
							sessionId,
							riskLevel: mini.riskLevel,
							mood: previousMood,
							themes: mini.themes,
						},
						tx
					);

					await this.sessions.updateMaxRisk(sessionId, mini.riskLevel, tx);
					await this.messages.create(
						{
							userId,
							sessionId,
							role: "assistant",
							content: replyText,
							metadata: { tags: ["greeting_short_circuit"] },
							voiceMode: "comfort",
							riskAtTurn: mini.riskLevel,
							themes: mini.themes,
						},
						tx
					);
					await this.sessions.incrementMessageCount(sessionId, 1, tx);
				});

				return {
					replyText,
					voiceMode: "comfort",
					mood: previousMood,
					riskLevel: mini.riskLevel,
				};
			}

			if (isTrivialTurn(userMessage)) {
				const userName =
					typeof (prefs as any).name === "string" ? (prefs as any).name : null;
				const replyText = (
					await this.firstResponseBrain.generateFirstResponse({
						userMessage,
						userName,
						mode: detectCompanionRequest(userMessage) ? "companion" : "support",
						riskLevel: conversationState.riskLevel ?? 0,
						companionRequested: detectCompanionRequest(userMessage),
						isStandalone: true,
					})
				).trim();

				const mini = buildMiniFallbackResult(userMessage);
				await db.transaction(async (tx) => {
					await this.states.upsert(
						{
							userId,
							summary: conversationState.summary,
							mood: previousMood,
							riskLevel: conversationState.riskLevel,
							lastThemes: conversationState.lastThemes,
							baselineDepression: conversationState.baselineDepression,
							baselineAnxiety: conversationState.baselineAnxiety,
							baselineStress: conversationState.baselineStress,
							preferences: prefs,
						},
						tx
					);

					await this.riskLogs.create(
						{
							userId,
							sessionId,
							riskLevel: mini.riskLevel,
							mood: previousMood,
							themes: mini.themes,
						},
						tx
					);

					await this.sessions.updateMaxRisk(sessionId, mini.riskLevel, tx);
					await this.messages.create(
						{
							userId,
							sessionId,
							role: "assistant",
							content: replyText || "Got it.",
							metadata: { tags: ["trivial_short_circuit"] },
							voiceMode: "comfort",
							riskAtTurn: mini.riskLevel,
							themes: mini.themes,
						},
						tx
					);
					await this.sessions.incrementMessageCount(sessionId, 1, tx);
				});

				return {
					replyText: replyText || "Got it.",
					voiceMode: "comfort",
					mood: previousMood,
					riskLevel: mini.riskLevel,
				};
			}

			const graph = ensureGraph(prefs.userStateGraph);
			const stateMappingSignals = (asObject(prefs.stateMappingSignals) ??
				null) as StateMappingSignals | null;

			const emitter = getEmitter(session.id);
			const retrievePromise = this.embeddingRepo.findRelevant(
				userId,
				userMessage,
				5
			);

			emitter.emit("phase", { phase: "analyzing", mood: previousMood });
			logger.info(
				{
					userId,
					sessionId,
					snippet: userMessage.slice(0, 120),
					recentCount: recent.length,
				},
				"[Turn] Starting MiniBrain.analyzeTurn"
			);
			let mini: MiniBrainResult;
			try {
				this.throwIfAborted(signal);
				mini = await this.miniBrain.analyzeTurn({
					userMessage,
					recentMessages: recent
						.slice()
						.reverse()
						.map((m) => ({ role: m.role, content: m.content })),
					currentState: {
						summary: conversationState.summary,
						mood: conversationState.mood,
						riskLevel: conversationState.riskLevel,
						baseline: {
							depression: conversationState.baselineDepression,
							anxiety: conversationState.baselineAnxiety,
							stress: conversationState.baselineStress,
						},
					},
				});
				this.throwIfAborted(signal);
			} catch (err) {
				if (err instanceof AppError && err.code === "TURN_ABORTED") throw err;
				if (isMiniValidationError(err)) {
					logger.warn(
						{ err },
						"[Turn] MiniBrain validation failed, using fallback"
					);
				} else if (err instanceof AppError) {
					throw err;
				} else {
					logger.warn({ err }, "[Turn] Analysis failed, using fallback");
				}
				mini = buildMiniFallbackResult(userMessage);
			}

			logger.info(
				{
					requiresCounselor: mini.requiresCounselor,
					riskLevel: mini.riskLevel,
					mood: mini.mood,
					themes: mini.themes,
					summaryDelta: (mini.summaryDelta || "").slice(0, 120),
				},
				"[Turn] MiniBrain result"
			);

			if (!mini.requiresCounselor) {
				logger.info(
					{
						userId,
						sessionId,
						snippet: userMessage.slice(0, 120),
					},
					"[Turn] Mini decided to skip Counselor — short-circuiting"
				);
				const userName =
					typeof (prefs as any).name === "string" ? (prefs as any).name : null;
				const replyText = (
					await this.firstResponseBrain.generateFirstResponse({
						userMessage,
						userName,
						mode: detectCompanionRequest(userMessage) ? "companion" : "support",
						riskLevel: conversationState.riskLevel ?? 0,
						companionRequested: detectCompanionRequest(userMessage),
						isStandalone: true,
					})
				).trim();

				await db.transaction(async (tx) => {
					await this.states.upsert(
						{
							userId,
							summary: conversationState.summary,
							mood: previousMood,
							riskLevel: conversationState.riskLevel,
							lastThemes: conversationState.lastThemes,
							baselineDepression: conversationState.baselineDepression,
							baselineAnxiety: conversationState.baselineAnxiety,
							baselineStress: conversationState.baselineStress,
							preferences: prefs,
						},
						tx
					);

					await this.riskLogs.create(
						{
							userId,
							sessionId,
							riskLevel: mini.riskLevel,
							mood: previousMood,
							themes: mini.themes,
						},
						tx
					);

					await this.sessions.updateMaxRisk(sessionId, mini.riskLevel, tx);
					await this.messages.create(
						{
							userId,
							sessionId,
							role: "assistant",
							content: replyText || "Got it.",
							metadata: { tags: ["mini_short_circuit"] },
							voiceMode: "comfort",
							riskAtTurn: mini.riskLevel,
							themes: mini.themes,
						},
						tx
					);
					await this.sessions.incrementMessageCount(sessionId, 1, tx);
				});

				return {
					replyText: replyText || "Got it.",
					voiceMode: "comfort",
					mood: previousMood,
					riskLevel: mini.riskLevel,
				};
			}

			const coordinated = coordinateTurn({
				userMessage,
				graph,
				signals: stateMappingSignals,
			});

			const nextSummary = [conversationState.summary, mini.summaryDelta]
				.filter(Boolean)
				.join("\n");
			logger.info(
				{ delta: coordinated.delta, decision: coordinated.decision },
				"[Turn] Coordinated decision"
			);
			const mood = normalizeMood(mini.mood);

			emitter.emit("phase", { phase: "recalling", mood });
			const safetyMode = this.getSafetyMode(mini.riskLevel);
			this.throwIfAborted(signal);
			const relevant = await retrievePromise;
			this.throwIfAborted(signal);

			const isHighRisk = mini.riskLevel > 3;

			const systemInstruction = buildSystemInstruction({
				riskLevel: mini.riskLevel,
				mode: detectCompanionRequest(userMessage) ? "companion" : "support",
				mood: mini.mood,
				stateDelta: coordinated.delta,
				languagePlan: coordinated.languagePlan,
				decision: coordinated.decision,
			});

			emitter.emit("phase", { phase: "formulating", mood });
			logger.info(
				{ isHighRisk, mood: mini.mood, riskLevel: mini.riskLevel },
				"[Turn] Preparing Counselor generation"
			);
			const counselor = isHighRisk
				? {
						replyText:
							"I hear the future going opaque in what you're saying. Before we do anything else: in this exact moment, are you safe from acting on it? If yes, tell me where in your body the pressure is strongest — chest, throat, stomach, head — and what it feels like (tight, heavy, fast, empty).",
						voiceMode: "crisis" as const,
						suggestedExercise: coordinated.decision.groundingEligible
							? "box_breathing"
							: null,
						tags: ["future_continuity", "safety_then_coherence"],
				  }
				: await this.withTimeout(
						this.counselorBrain.generateReply({
							conversationWindow: recent
								.slice()
								.reverse()
								.map((m) => ({ role: m.role, content: m.content })),
							summary: nextSummary,
							mood: mini.mood,
							riskLevel: mini.riskLevel,
							themes: mini.themes,
							safetyMode,
							relevantDocs: relevant,
							baseline: {
								depression: conversationState.baselineDepression,
								anxiety: conversationState.baselineAnxiety,
								stress: conversationState.baselineStress,
							},
							preferences: {
								...prefs,
								userStateGraph: coordinated.nextGraph,
								stateMappingContext: extractStateMappingContext({
									...prefs,
									userStateGraph: coordinated.nextGraph,
								}),
								stateDelta: coordinated.delta,
								responseClass: coordinated.decision.responseClass,
								groundingEligible: coordinated.decision.groundingEligible,
								groundingReason: coordinated.decision.groundingReason,
								languagePlan: coordinated.languagePlan,
							},
							systemInstruction,
						}),
						4000
				  );
			this.throwIfAborted(signal);

			const voiceMode =
				safetyMode === "crisis" ? "crisis" : counselor.voiceMode;

			await db.transaction(async (tx) => {
				await this.states.upsert(
					{
						userId,
						summary: nextSummary,
						mood,
						riskLevel: mini.riskLevel,
						lastThemes: mini.themes,
						baselineDepression: conversationState.baselineDepression,
						baselineAnxiety: conversationState.baselineAnxiety,
						baselineStress: conversationState.baselineStress,
						preferences: {
							...prefs,
							userStateGraph: coordinated.nextGraph,
						},
					},
					tx
				);

				await this.riskLogs.create(
					{
						userId,
						sessionId,
						riskLevel: mini.riskLevel,
						mood,
						themes: mini.themes,
					},
					tx
				);

				await this.sessions.updateMaxRisk(sessionId, mini.riskLevel, tx);

				await this.messages.create(
					{
						userId,
						sessionId,
						role: "assistant",
						content: counselor.replyText,
						metadata: {
							suggestedExercise: counselor.suggestedExercise,
							tags: counselor.tags,
							relevantDocs: relevant,
						},
						voiceMode,
						riskAtTurn: mini.riskLevel,
						themes: mini.themes,
					},
					tx
				);

				await this.sessions.incrementMessageCount(sessionId, 1, tx);
			});

			emitter.emit("phase", { phase: "replying", mood });
			emitter.emit("end");

			return {
				replyText: counselor.replyText,
				voiceMode,
				mood: mini.mood,
				riskLevel: mini.riskLevel,
			};
		} finally {
			this.endTurn(sessionId, turnController);
		}
	}

	async *handleUserTurnStream(
		userId: string,
		sessionId: string,
		userMessage: string,
		options?: {
			bufferText?: string;
			chunkSize?: number;
		}
	): AsyncGenerator<string, void, void> {
		const bufferText = options?.bufferText ?? "";
		const chunkSize = options?.chunkSize ?? 128;

		if (bufferText) yield bufferText;

		const turn = await this.handleUserTurn(userId, sessionId, userMessage);
		const full = turn.replyText ?? "";
		for (let i = 0; i < full.length; i += chunkSize) {
			yield full.slice(i, i + chunkSize);
		}
	}

	private async saveTurnAsync(
		userId: string,
		sessionId: string,
		userMessage: string,
		replyText: string,
		mini: any,
		voiceMode: string,
		state: any,
		relevantDocs: any = []
	): Promise<void> {
		try {
			await db.transaction(async (tx) => {
				const nextSummary =
					[state?.summary, mini?.summaryDelta].filter(Boolean).join("\n") ||
					state?.summary;

				const basePrefs = state?.preferences ?? {};
				const prefs = mergePreferencesWithImmediateFacts(
					basePrefs,
					userMessage
				);

				await this.states.upsert(
					{
						userId,
						summary: nextSummary,
						mood: normalizeMood(mini?.mood ?? "mixed"),
						riskLevel: mini?.riskLevel ?? 0,
						lastThemes: mini?.themes ?? [],
						...(state.baselineDepression !== undefined && {
							baselineDepression: state.baselineDepression,
						}),
						...(state.baselineAnxiety !== undefined && {
							baselineAnxiety: state.baselineAnxiety,
						}),
						...(state.baselineStress !== undefined && {
							baselineStress: state.baselineStress,
						}),
						preferences: prefs,
					},
					tx
				);

				await Promise.all([
					this.riskLogs.create(
						{
							userId,
							sessionId,
							riskLevel: mini?.riskLevel ?? 0,
							mood: mini?.mood ?? "mixed",
							themes: mini?.themes ?? [],
						},
						tx
					),
					this.sessions.updateMaxRisk(sessionId, mini?.riskLevel ?? 0, tx),
					this.sessions.incrementMessageCount(sessionId, 1, tx),
				]);

				await this.messages.create(
					{
						userId,
						sessionId,
						role: "assistant",
						content: replyText,
						metadata: {
							relevantDocs,
							tags: ["streamed"],
							miniAnalysis: mini,
						},
						voiceMode: voiceMode as any,
						riskAtTurn: mini?.riskLevel ?? 0,
						themes: mini?.themes ?? [],
					},
					tx
				);
			});
		} catch (err) {
			logger.error(
				{ err, userId, sessionId },
				"Critical: saveTurnAsync failed"
			);
		}
	}

	async *handleUserTurnModelStream(
		userId: string,
		sessionId: string,
		userMessage: string,
		options?: { abortController?: AbortController }
	): AsyncGenerator<{ text: string; voiceMode?: string }, void, void> {
		const turnController =
			options?.abortController ?? this.beginTurn(sessionId);
		const signal = turnController.signal;

		const trimmedMsg = userMessage.trim().toLowerCase();
		if (isGreetingTurn(userMessage) || isEllipsisOnlyTurn(trimmedMsg)) {
			yield {
				text: isGreetingTurn(userMessage)
					? "Hello! Marmalade Here."
					: "I'm listening...",
				voiceMode: "comfort",
			};
			this.endTurn(sessionId, turnController);
			return;
		}

		const statePromise = this.states.getByUserId(userId);
		const recentMessagesPromise = this.messages.listRecentBySession(
			sessionId,
			5
		);
		const ragPromise = this.embeddingRepo.findRelevant(userId, userMessage, 3);

		try {
			if (userMessage.length > 20) {
				const randomFiller =
					FILLER_PHRASES[Math.floor(Math.random() * FILLER_PHRASES.length)]!;

				yield {
					text: randomFiller,
					voiceMode: "thoughtful",
				};
			}

			const [state, recent, relevant] = await Promise.all([
				statePromise,
				recentMessagesPromise,
				ragPromise,
			]);

			const miniBrainPromise = this.miniBrain
				.analyzeTurn({
					userMessage,
					recentMessages: recent
						.map((m) => ({ role: m.role, content: m.content }))
						.reverse(),
					currentState: state || {},
				})
				.catch(() => buildMiniFallbackResult(userMessage));

			const coordinated = coordinateTurn({
				userMessage,
				graph: ensureGraph((state as any)?.preferences?.userStateGraph),
			});

			const stream = this.counselorBrain.generateReplyTextStream({
				conversationWindow: recent
					.map((m) => ({ role: m.role, content: m.content }))
					.reverse(),
				systemInstruction: buildSystemInstruction({
					mood: (state as any)?.mood || "mixed",
					riskLevel: (state as any)?.riskLevel ?? 0,
					mode: "support",
					stateDelta: coordinated.delta,
					languagePlan: coordinated.languagePlan,
					decision: coordinated.decision,
				}),
				relevantDocs: relevant,
				baseline: {
					depression: (state as any)?.baselineDepression ?? null,
					anxiety: (state as any)?.baselineAnxiety ?? null,
					stress: (state as any)?.baselineStress ?? null,
				},
				summary: (state as any)?.summary ?? null,
				riskLevel: (state as any)?.riskLevel ?? 0,
				themes: (state as any)?.themes ?? [],
				preferences: (state as any)?.preferences ?? {},
				safetyMode: this.getSafetyMode((state as any)?.riskLevel ?? 0),
			});

			let proText = "";
			for await (const chunk of stream) {
				if (signal.aborted) break;
				const text = this.extractText(chunk);
				if (text) {
					proText += text;
					yield { text, voiceMode: "comfort" };
				}
			}

			if (proText.trim() && !signal.aborted) {
				const finalMiniResults = await miniBrainPromise;

				this.saveTurnAsync(
					userId,
					sessionId,
					userMessage,
					proText.trim(),
					finalMiniResults,
					"comfort",
					{ preferences: { userStateGraph: coordinated.nextGraph } },
					relevant
				).catch((e) => logger.error(e, "Async Save failed"));
			}
		} catch (e) {
			logger.error(e, "[Stream] Error");
			yield {
				text: "I'm having a little trouble. One sec?",
				voiceMode: "comfort",
			};
		} finally {
			this.endTurn(sessionId, turnController);
		}
	}

	async summarizeSession(
		sessionId: string,
		userId: string,
		client: DBClient = db
	) {
		const session = await this.sessions.findById(sessionId, client);
		if (!session || session.userId !== userId) {
			throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
		}

		const sessionMessages = await client
			.select()
			.from(messages)
			.where(eq(messages.sessionId, sessionId))
			.orderBy(desc(messages.createdAt));
		const risks = await this.riskLogs.listBySession(sessionId, client);

		const riskSummary =
			risks.length === 0
				? { min: 0, max: 0, avg: 0 }
				: {
						min: Math.min(...risks.map((r) => r.riskLevel)),
						max: Math.max(...risks.map((r) => r.riskLevel)),
						avg: risks.reduce((acc, r) => acc + r.riskLevel, 0) / risks.length,
				  };

		const messagesAsc = sessionMessages.slice().reverse();
		const firstMessage = messagesAsc[0];
		const lastMessage = messagesAsc[messagesAsc.length - 1];

		const aggregatedThemes = Array.from(
			new Set(risks.flatMap((r) => (Array.isArray(r.themes) ? r.themes : [])))
		);

		const sessionMeta = {
			messageCount: sessionMessages.length,
			risk: riskSummary,
			topThemes: aggregatedThemes,
			snippets: {
				firstMessage: firstMessage?.content?.slice(0, 400) ?? null,
				lastMessage: lastMessage?.content?.slice(0, 400) ?? null,
			},
			startAt: firstMessage?.createdAt ?? null,
			endAt: lastMessage?.createdAt ?? null,
		};

		try {
			const state = await this.states.getByUserId(userId, client);
			const prefs = asObject(state?.preferences) ?? {};
			const mappingContext = extractStateMappingContext({
				...prefs,
				userStateGraph: ensureGraph(prefs.userStateGraph),
			});
			(sessionMeta as any).stateMappingContext = mappingContext;
		} catch (e) {
			logger.warn(
				{ err: e },
				"Failed to fetch state mapping context for session summary"
			);
		}

		const summaryContent = JSON.stringify(
			{
				messageCount: sessionMessages.length,
				risk: riskSummary,
				messages: sessionMessages.map((m) => ({
					role: m.role,
					content: m.content,
					createdAt: m.createdAt,
				})),
			},
			null,
			2
		);

		const embedding = await this.embeddingClient.embed(summaryContent);
		const doc = await this.memoryDocs.create(
			{
				userId,
				sessionId,
				content: summaryContent,
				metadata: sessionMeta,
				type: "session_summary",
				embedding,
			},
			client
		);

		await this.sessions.endSession(sessionId, { summaryDocId: doc.id }, client);

		return doc;
	}

	private getSafetyMode(
		risk: number
	): "normal" | "caution" | "high_caution" | "crisis" {
		if (risk >= 4) return "crisis";
		if (risk === 3) return "high_caution";
		if (risk === 2) return "caution";
		return "normal";
	}

	private extractText(chunk: any): string {
		if (!chunk) return "";
		if (typeof chunk === "string") return chunk;

		return (
			chunk?.candidates?.[0]?.content?.parts?.[0]?.text ||
			chunk?.choices?.[0]?.delta?.content ||
			chunk?.text ||
			""
		);
	}

	private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
		let timeoutHandle: NodeJS.Timeout | null = null;
		const timeoutPromise = new Promise<T>((resolve) => {
			timeoutHandle = setTimeout(() => resolve(EMERGENCY_PACKET as T), ms);
		});

		try {
			return await Promise.race([promise, timeoutPromise]);
		} catch (error) {
			logger.error(
				{ err: error },
				"Counselor agent failed, using emergency packet"
			);
			return EMERGENCY_PACKET as T;
		} finally {
			if (timeoutHandle) clearTimeout(timeoutHandle);
		}
	}
}
