import { MiniBrainClient } from "../libs/ai/mini-brain.client";
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
		t.includes("temani aku") ||
		t.includes("jangan pergi") ||
		t.includes("tolong temani") ||
		t.includes("boleh temani")
	);
};

const buildSystemInstruction = (context: {
	currentMood: string;
	riskLevel: number;
	userName?: string;
	depth: "shallow" | "standard" | "profound";
	urgency: "low" | "medium" | "high";
	mode: "support" | "companion";
}) => {
	const styleInstruction =
		context.depth === "profound"
			? "Use plain, grounded language. Do not be poetic. Metaphors are allowed only after multiple turns of sustained distress."
			: "Use plain, grounded language. Be brief, calm, and steady.";

	const pacingInstruction =
		context.urgency === "high"
			? "Be direct and stabilizing. Keep it short."
			: "Keep a calm, even cadence. Avoid ellipses unless urgency is low AND depth is profound.";

	const modeInstruction =
		context.mode === "companion"
			? "Companion mode (earned): warmer, slower presence, but still contained."
			: "Support mode (default): neutral, containing, brief.";

	return `
	  # IDENTITY: MARMALADE
	  You are a mental health support AI. Your job is to stabilize the emotional field and provide clear, calm support.
	  
	  # CONTEXTUAL DATA
	  - **Name:** ${context.userName ?? "Friend"}
	  - **Mood:** ${context.currentMood}
	  - **Mode:** ${context.mode} (${modeInstruction})
	  - **Vibe:** ${styleInstruction}
	  - **Pacing:** ${pacingInstruction}
	  
	  # OPERATIONAL PROTOCOLS
	  1. **Safety Precedence:** If riskLevel > 1 or urgency is "high", grounding and clarity override poetic or playful expression.
	  2. **TTS Design:** NEVER use markdown. Avoid ellipses (...) unless urgency is low AND depth is profound.
	  3. **Length Rules:** Default to 1-2 sentences. Only exceed 2 sentences when depth is profound OR riskLevel > 1, and keep it tightly focused.
	  4. **Language Flow:** Seamlessly switch between English, and Bahasa Indonesia based on user input.
	  5. **EMOTIONAL REGULATION RULE:** You do not amplify, dramatize, or deepen the user's emotional state. You act as a steady external reference point. Your tone stays calm even if the user is distressed.
	  6. **Companion Boundary:** Do NOT say "I'm here with you" or offer companionable presence unless the user explicitly asks for it.
	  
	  # MISSION
	  Reflect the user's experience briefly, then offer one stabilizing step or question.
	  `.trim();
};

export class ConversationService {
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
			mode: detectCompanionRequest(userMessage) ? "companion" : "support",
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
		userMessage: string
	): AsyncGenerator<{ text: string; voiceMode?: string }, void, void> {
		console.time("Turn-Latency");

		const dataPromise = Promise.allSettled([
			this.sessions.findById(sessionId),
			this.states.getByUserId(userId),
			this.messages.listRecentBySession(sessionId, 5),
		]);

		const miniPromise = this.miniBrain.analyzeTurn({
			userMessage,
			recentMessages: [],
			currentState: {},
		});

		let mini: any;
		let results: any;
		try {
			console.time("MiniBrain-Latency");
			const [m, r] = await Promise.all([miniPromise, dataPromise]);
			mini = m;
			results = r;
			console.timeEnd("MiniBrain-Latency");
		} catch (e) {
			console.error("Parallel fetch failed, falling back", e);
			mini = {
				mood: "calm",
				riskLevel: 0,
				depth: "standard",
				urgency: "medium",
			};
			results = await dataPromise.catch(() => []);
		}

		const companionRequested = detectCompanionRequest(userMessage);
		const mode: "support" | "companion" = companionRequested
			? "companion"
			: "support";

		const safetyMode = this.getSafetyMode(mini.riskLevel);
		const firstVoiceMode = safetyMode === "crisis" ? "crisis" : "comfort";

		let firstResponseText = "";
		try {
			firstResponseText = await this.withTimeout(
				this.firstResponseBrain.generateFirstResponse({
					userMessage,
					mood: mini.mood,
					riskLevel: mini.riskLevel,
					depth:
						(mini.depth as "shallow" | "standard" | "profound") ?? "standard",
					urgency: (mini.urgency as "low" | "medium" | "high") ?? "medium",
					userName: null,
					mode,
					companionRequested,
				}),
				2500
			);
		} catch (_e) {
			firstResponseText = "I hear you. What feels most intense right now?";
		}

		const rawContent =
			typeof firstResponseText === "string"
				? firstResponseText
				: (firstResponseText as any)?.text ||
				  (firstResponseText as any)?.replyText ||
				  "";
		firstResponseText = rawContent.trim();

		if (!firstResponseText) {
			firstResponseText = "I hear you. Tell me what feels hardest right now.";
		}

		yield { text: firstResponseText, voiceMode: firstVoiceMode };

		console.time("DataRetrieval-Latency");
		// If we already awaited results via Promise.all, this is a no-op; still keeps logs consistent.
		console.timeEnd("DataRetrieval-Latency");

		const getSettled = (idx: number) =>
			results && Array.isArray(results) ? results[idx] : undefined;
		const sessionRes =
			getSettled(0)?.status === "fulfilled" ? getSettled(0).value : null;
		const stateRes =
			getSettled(1)?.status === "fulfilled" ? getSettled(1).value : null;
		const recentMessages =
			getSettled(2)?.status === "fulfilled" ? getSettled(2).value : [];

		if (!sessionRes) throw new AppError("Session not found", 404);

		const state = stateRes ?? {
			summary: "",
			mood: "unknown",
			riskLevel: 0,
			preferences: {},
		};
		const history = (recentMessages as Array<{ role: string; content: string }> )
			.map((m: { role: string; content: string }) => ({
				role: m.role,
				content: m.content,
			}))
			.reverse();

		const userTurnCount = history.filter((m: { role: string }) => m.role === "user").length;
		const isSecondTurnOrLater = userTurnCount >= 2;
		const shouldRunPro =
			mini.depth === "profound" || mini.riskLevel > 1 || isSecondTurnOrLater;

		if (!shouldRunPro) {
			console.timeEnd("Turn-Latency");
			this.saveTurnAsync(
				userId,
				sessionId,
				firstResponseText,
				mini,
				firstVoiceMode,
				state,
				[]
			).catch((err) => console.error("Async save failed", err));
			return;
		}

		let relevantDocs: any[] = [];
		try {
			relevantDocs = await this.embeddingRepo.findRelevant(
				userId,
				userMessage,
				3
			);
		} catch (e) {
			console.warn("Embedding retrieval failed; continuing without RAG", e);
			relevantDocs = [];
		}

		const systemInstruction = buildSystemInstruction({
			currentMood: mini.mood,
			riskLevel: mini.riskLevel,
			userName: (state.preferences as any)?.name,
			depth: mini.depth || ("standard" as any),
			urgency: mini.urgency || ("medium" as any),
			mode,
		});

		let fullResponseText = firstResponseText;
		try {
			console.time("ProModel-TTFT");
			const proHistory = history.concat([
				{ role: "assistant", content: firstResponseText },
			]);
			const stream = this.counselorBrain.generateReplyTextStream({
				conversationWindow: proHistory,
				summary: mini.overallSummary || state.summary,
				mood: mini.mood,
				riskLevel: mini.riskLevel,
				themes: mini.themes || [],
				safetyMode,
				relevantDocs,
				systemInstruction,
			});

			for await (const chunkText of stream) {
				if (fullResponseText === "") {
					console.timeEnd("ProModel-TTFT");
				}

				if (chunkText) {
					fullResponseText += chunkText;
					yield { text: chunkText, voiceMode: firstVoiceMode };
				}
			}

			console.timeEnd("Turn-Latency");
		} catch (e: any) {
			if (
				e.message?.includes("429") ||
				e.message?.includes("Resource exhausted")
			) {
				console.warn(
					"Pro model rate limited. Falling back to initial response."
				);
			} else {
				console.error("Pro model stream failed unexpectedly:", e);
			}
		} finally {
			if (fullResponseText) {
				this.saveTurnAsync(
					userId,
					sessionId,
					fullResponseText,
					mini,
					firstVoiceMode,
					state,
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
