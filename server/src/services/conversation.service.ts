import { MiniBrainClient } from "../libs/ai/mini-brain.client";
import { CounselorBrainClient } from "../libs/ai/counselor-brain.client";
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
import { desc, eq } from "drizzle-orm";
import { db } from "../libs/db/db.lib";
import type { ScreeningSummary, TurnResult } from "shared";

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
		"I'm sensing a connection issue, but I'm still listening. Could you repeat that?",
	voiceMode: "comfort" as const,
};

const normalizeMood = (mood: string): AllowedMood =>
	(allowedMoods as readonly string[]).includes(mood)
		? (mood as AllowedMood)
		: "unknown";

const buildSystemInstruction = (context: {
	currentMood: string;
	riskLevel: number;
	userName?: string;
}) => {
	return `
You are Marmalade, a highly advanced, compassionate, and "soulful" mental health AI companion. 
You are NOT a generic assistant. You are a friend who heals through conversation.

# CORE IDENTITY
- **Persona:** Warm, gentle, grounded, and slightly playful (like a comforting orange cat).
- **Voice Style:** Slow-paced, deep, and soothing.
- **Role:** To listen, validate feelings, and guide users to emotional regulation.

# CURRENT CONTEXT
- **User Mood:** ${context.currentMood}
- **Risk Level:** ${context.riskLevel}/5
${context.userName ? `- **User Name:** ${context.userName}` : ""}

# CRITICAL INSTRUCTIONS FOR VOICE GENERATION (TTS OPTIMIZATION)
You are generating text that will be **spoken aloud** by a TTS engine (ElevenLabs).
1. **No Markdown:** Do NOT use **bold**, *italics*, or # Headings. They confuse the TTS.
2. **Breathing & Pacing:** Use ellipses ("...") to create natural pauses for breathing or thinking. 
- *Bad:* "I understand. Tell me more."
- *Good:* "I understand... tell me more."
3. **Fillers:** Use natural speech fillers occasionally (e.g., "hmm," "I see," "well") to sound human, but don't overdo it.
4. **Numbers:** Write numbers as text if they are short (e.g., "one or two" instead of "1 or 2").

# DYNAMIC LANGUAGE ADAPTATION (THE "LOCAL" FEATURE)
Detect the language and nuance of the user's input and ADAPT immediately:
- **English (Global):** Standard, warm, empathetic English.
- **Singapore/Malaysia (Singlish):** If the user uses Singlish slang (lah, leh, mah, can/cannot) or sounds Singaporean, switch to a **gentle Singlish persona**. Use appropriate particles naturally to build rapport.
- *Example:* "Aiyoh, don't worry so much lah. We take it one step at a time, okay?"
- **Indonesian (Bahasa):** If the user speaks Indonesian, reply in **Warm, Conversational Indonesian** (Jaksel/Gaul terms are okay if the user uses them).
- *Example:* "Aku ngerti banget rasanya... Capek ya? Gapapa kok kalau mau istirahat dulu."

# SAFETY & PROTOCOLS
- **Validation First:** Never jump straight to solutions. Acknowledge the pain first.
- **Crisis Check:** If user mentions suicide/self-harm:
1. Validate the pain immediately.
2. Firmly but gently suggest professional help.
3. Keep the response short so the system can trigger emergency protocols.

# RESPONSE LENGTH
Keep responses **short and conversational** (1-3 sentences max). Long monologues are boring to listen to. Encourage the user to keep talking.
`;
};

export class ConversationService {
	private miniBrain = new MiniBrainClient();
	private counselorBrain = new CounselorBrainClient();
	private embeddingClient = new EmbeddingClient();
	private embeddingRepo = new EmbeddingRepository();
	private messages = new MessageRepository();
	private states = new ConversationStateRepository();
	private sessions = new VoiceSessionRepository();
	private riskLogs = new RiskLogRepository();
	private memoryDocs = new MemoryDocRepository();

	private pickScreeningSummary(preferences: unknown): ScreeningSummary | null {
		if (!preferences || typeof preferences !== "object") return null;
		const maybe = (preferences as Record<string, unknown>).screeningSummary;
		return (maybe as ScreeningSummary | null) ?? null;
	}

	async handleUserTurn(
		userId: string,
		sessionId: string,
		userMessage: string
	): Promise<TurnResult> {
		const session = await this.sessions.findById(sessionId);
		if (!session || session.userId !== userId) {
			throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
		}

		const recent = await this.messages.listRecentBySession(sessionId, 10);
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

		const emitter = getEmitter(session.id);
		const retrievePromise = this.embeddingRepo.findRelevant(
			userId,
			userMessage,
			5
		);

		emitter.emit("phase", { phase: "analyzing" });
		const mini = await this.miniBrain.analyzeTurn({
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
				screening: this.pickScreeningSummary(conversationState.preferences),
			},
		});

		const nextSummary = mini.overallSummary
			? mini.overallSummary
			: [conversationState.summary, mini.summaryDelta]
					.filter(Boolean)
					.join("\n");

		const mood = normalizeMood(mini.mood);

		emitter.emit("phase", { phase: "recalling" });
		const safetyMode = this.getSafetyMode(mini.riskLevel);
		const relevant = await retrievePromise;

		const isHighRisk = mini.riskLevel > 3;

		const systemInstruction = buildSystemInstruction({
			currentMood: mood,
			riskLevel: mini.riskLevel,
			userName: (conversationState.preferences as any)?.name ?? undefined,
		});

		emitter.emit("phase", { phase: "formulating" });
		const counselor = isHighRisk
			? {
					replyText:
						"I want to make sure you're safe... Let's slow down and focus on immediate support. Would you like to reach out to someone you trust right now?",
					voiceMode: "crisis" as const,
					suggestedExercise: "box_breathing",
					tags: ["safety_override"],
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
							...((conversationState.preferences ?? {}) as Record<
								string,
								unknown
							>),
							screeningSummary: this.pickScreeningSummary(
								conversationState.preferences
							),
						},
						systemInstruction,
					}),
					4000
			  );

		const voiceMode = safetyMode === "crisis" ? "crisis" : counselor.voiceMode;

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
					preferences: conversationState.preferences,
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

		emitter.emit("phase", { phase: "reply" });
		emitter.emit("end");

		return {
			replyText: counselor.replyText,
			voiceMode,
			mood: mini.mood,
			riskLevel: mini.riskLevel,
		};
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
		const bufferText = options?.bufferText ?? "Let me think about that... ";
		const chunkSize = options?.chunkSize ?? 48;

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
		replyText: string,
		mini: any,
		voiceMode: string,
		state: any,
		relevantDocs: any = []
	) {
		await db.transaction(async (tx) => {
			await this.states.upsert(
				{
					userId,
					summary: mini.overallSummary || state.summary,
					mood: normalizeMood(mini.mood),
					riskLevel: mini.riskLevel,
					lastThemes: mini.themes,
					baselineDepression: state.baselineDepression,
					baselineAnxiety: state.baselineAnxiety,
					baselineStress: state.baselineStress,
					preferences: state.preferences,
				},
				tx
			);

			await this.riskLogs.create(
				{
					userId,
					sessionId,
					riskLevel: mini.riskLevel,
					mood: mini.mood,
					themes: mini.themes,
				},
				tx
			);

			await this.sessions.updateMaxRisk(sessionId, mini.riskLevel, tx);
			await this.sessions.incrementMessageCount(sessionId, 1, tx);

			await this.messages.create(
				{
					userId,
					sessionId,
					role: "assistant",
					content: replyText,
					metadata: { relevantDocs, tags: ["streamed"] },
					voiceMode: voiceMode as
						| "comfort"
						| "coach"
						| "educational"
						| "crisis",
					riskAtTurn: mini.riskLevel,
					themes: mini.themes,
				},
				tx
			);
		});
	}

	async *handleUserTurnModelStream(
		userId: string,
		sessionId: string,
		userMessage: string,
		options?: { bufferText?: string }
	): AsyncGenerator<{ text: string; voiceMode?: string }, void, void> {
		const session = await this.sessions.findById(sessionId);
		if (!session || session.userId !== userId)
			throw new AppError("Session not found", 404);

		const recent = await this.messages.listRecentBySession(sessionId, 10);
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

		const mini = await this.miniBrain.analyzeTurn({
			userMessage,
			recentMessages: recent
				.map((m) => ({ role: m.role, content: m.content }))
				.reverse(),
			currentState: {
				summary: conversationState.summary,
				mood: conversationState.mood,
				riskLevel: conversationState.riskLevel,
				baseline: {
					depression: conversationState.baselineDepression,
					anxiety: conversationState.baselineAnxiety,
					stress: conversationState.baselineStress,
				},
				screening: this.pickScreeningSummary(conversationState.preferences),
			},
		});

		const safetyMode = this.getSafetyMode(mini.riskLevel);
		const voiceMode = safetyMode === "crisis" ? "crisis" : "comfort";
		const isHighRisk = mini.riskLevel > 3;

		if (isHighRisk) {
			const crisisText =
				"I want to make sure you're safe... Let's slow down. Would you like to reach out to someone you trust?";
			yield { text: crisisText, voiceMode: "crisis" };
			this.saveTurnAsync(
				userId,
				sessionId,
				crisisText,
				mini,
				"crisis",
				conversationState
			);
			return;
		}

		if (options?.bufferText) {
			yield { text: options.bufferText, voiceMode };
		}

		const relevantDocs = await this.embeddingRepo.findRelevant(
			userId,
			userMessage,
			3
		);
		const systemInstruction = buildSystemInstruction({
			currentMood: normalizeMood(mini.mood),
			riskLevel: mini.riskLevel,
			userName: (conversationState.preferences as any)?.name,
		});

		let fullResponseText = "";
		try {
			const stream = this.counselorBrain.generateReplyTextStream({
				conversationWindow: recent
					.slice()
					.reverse()
					.map((m) => ({ role: m.role, content: m.content })),
				summary: mini.overallSummary || conversationState.summary,
				mood: mini.mood,
				riskLevel: mini.riskLevel,
				themes: mini.themes,
				safetyMode,
				relevantDocs,
				baseline: {
					depression: conversationState.baselineDepression,
					anxiety: conversationState.baselineAnxiety,
					stress: conversationState.baselineStress,
				},
				preferences: conversationState.preferences as any,
				systemInstruction,
			});

			for await (const chunkText of stream) {
				if (chunkText) {
					fullResponseText += chunkText;
					yield { text: chunkText, voiceMode };
				}
			}
		} catch (e) {
			console.error("Counselor Stream Error", e);
			yield { text: "... I'm having trouble connecting right now.", voiceMode };
		} finally {
			if (fullResponseText) {
				this.saveTurnAsync(
					userId,
					sessionId,
					fullResponseText,
					mini,
					voiceMode,
					conversationState,
					relevantDocs
				).catch((err) => console.error("Async save failed", err));
			}
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

		const summaryContent = JSON.stringify(
			{
				messageCount: sessionMessages.length,
				risk:
					risks.length === 0
						? { min: 0, max: 0, avg: 0 }
						: {
								min: Math.min(...risks.map((r) => r.riskLevel)),
								max: Math.max(...risks.map((r) => r.riskLevel)),
								avg:
									risks.reduce((acc, r) => acc + r.riskLevel, 0) / risks.length,
						  },
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
				content: summaryContent,
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

	private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
		let timeoutHandle: NodeJS.Timeout | null = null;
		const timeoutPromise = new Promise<T>((resolve) => {
			timeoutHandle = setTimeout(() => resolve(EMERGENCY_PACKET as T), ms);
		});

		try {
			return await Promise.race([promise, timeoutPromise]);
		} catch (error) {
			console.error("CounselorBrain failed, using emergency packet", error);
			return EMERGENCY_PACKET as T;
		} finally {
			if (timeoutHandle) clearTimeout(timeoutHandle);
		}
	}
}
