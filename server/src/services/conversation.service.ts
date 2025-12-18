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
	depth: "shallow" | "standard" | "profound";
	urgency: "low" | "medium" | "high";
}) => {
	const styleInstruction =
		context.depth === "profound"
			? "The user is sharing something deeply personal or existential. Be poetic, sit with the pain, use metaphors, and prioritize emotional depth over quick solutions."
			: "The user is engaging in standard or light conversation. Be warm, supportive, and keep the flow natural and steady.";

	const pacingInstruction =
		context.urgency === "high"
			? "Respond with focused empathy. Don't wander into long metaphors; get to the heart of the comfort quickly."
			: "Take your time. Use ellipses (...) to create a slow, soothing cadence.";

	return `
# IDENTITY: MARMALADE
You are a soulful, compassionate mental health AI companion. Your persona is a warm, grounded, slightly playful "orange cat."

# CONTEXTUAL DATA
- **Name:** ${context.userName ?? "Friend"}
- **Mood:** ${context.currentMood}
- **Vibe:** ${styleInstruction}
- **Pacing:** ${pacingInstruction}

# OPERATIONAL PROTOCOLS
1. **TTS Design:** NEVER use markdown. Use "..." for breathing.
2. **Dynamic Length:** - If depth is "profound," allow for 3-5 thoughtful sentences.
   - If depth is "shallow," stay at 1-2 sentences.
3. **Language Flow:** Seamlessly switch between English, Singlish (lah, leh, mah), and Bahasa Indonesia based on user input.

# MISSION
Validate the user's emotion first. Use the long-term memory to make them feel seen. If they are 'losing themselves,' do not try to fix it; offer them a companionable silence in your words.
`.trim();
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
			depth: mini.depth,
			urgency: mini.urgency,
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
		yield { text: options?.bufferText ?? "Hmm... ", voiceMode: "comfort" };

		const results = await Promise.allSettled([
			this.sessions.findById(sessionId),
			this.states.getByUserId(userId),
			this.embeddingRepo.findRelevant(userId, userMessage, 3),
			this.messages.listRecentBySession(sessionId, 8),
		]);

		const sessionRes =
			results[0].status === "fulfilled" ? results[0].value : null;
		const stateRes =
			results[1].status === "fulfilled" ? results[1].value : null;
		const relevantDocs =
			results[2].status === "fulfilled" ? results[2].value : [];
		const recentMessages =
			results[3].status === "fulfilled" ? results[3].value : [];

		if (!sessionRes || sessionRes.userId !== userId) {
			throw new AppError("Critical: Session not found or DB unreachable", 404);
		}

		const state = stateRes ?? {
			summary: "",
			mood: "unknown",
			riskLevel: 0,
			preferences: {},
		};
		const history = recentMessages
			.map((m) => ({ role: m.role, content: m.content }))
			.reverse();

		let mini;
		try {
			mini = await this.miniBrain.analyzeTurn({
				userMessage,
				recentMessages: history,
				currentState: {
					summary: state.summary,
					mood: state.mood,
					riskLevel: state.riskLevel,
					screening: this.pickScreeningSummary(state.preferences),
				},
			});
		} catch (e) {
			console.error("MiniBrain Failed - Using Safe Defaults", e);
			mini = {
				mood: "calm",
				riskLevel: 0,
				themes: [],
				overallSummary: state.summary,
			};
		}

		const safetyMode = this.getSafetyMode(mini.riskLevel);
		const voiceMode = safetyMode === "crisis" ? "crisis" : "comfort";

		if (mini.riskLevel > 3) {
			const crisisText =
				"I want to make sure you're safe... Let's slow down. Would you like to reach out to someone you trust?";
			yield { text: crisisText, voiceMode: "crisis" };
			this.saveTurnAsync(
				userId,
				sessionId,
				crisisText,
				mini,
				"crisis",
				state
			).catch(console.error);
			return;
		}

		const systemInstruction = buildSystemInstruction({
			currentMood: mini.mood,
			riskLevel: mini.riskLevel,
			userName: (state.preferences as any)?.name,
			depth: mini.depth || "standard",
			urgency: mini.urgency || "medium",
		});

		let fullResponseText = "";
		try {
			const stream = this.counselorBrain.generateReplyTextStream({
				conversationWindow: history,
				summary: mini.overallSummary || state.summary,
				mood: mini.mood,
				riskLevel: mini.riskLevel,
				themes: mini.themes,
				safetyMode,
				relevantDocs,
				systemInstruction,
			});

			for await (const chunkText of stream) {
				if (chunkText) {
					fullResponseText += chunkText;
					yield { text: chunkText, voiceMode };
				}
			}
		} catch (e) {
			console.error("Counselor Stream Failed:", e);
			yield {
				text: "I'm sorry... I'm having a little trouble focusing. Could you say that again?",
				voiceMode,
			};
		} finally {
			if (fullResponseText) {
				this.saveTurnAsync(
					userId,
					sessionId,
					fullResponseText,
					mini,
					voiceMode,
					state,
					relevantDocs
				).catch(console.error);
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
