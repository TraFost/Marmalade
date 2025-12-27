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
import { BASE_PERSONA } from "../libs/ai/prompts/shared.prompt";

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
	"mati",
	"bunuh",
	"sakit",
	"tolong",
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
		t === "halo" ||
		t === "hai" ||
		t === "pagi" ||
		t === "siang" ||
		t === "malam" ||
		t === "good morning" ||
		t === "good night" ||
		t === "good evening" ||
		t.startsWith("good morning") ||
		t.startsWith("selamat pagi") ||
		t.startsWith("selamat siang") ||
		t.startsWith("selamat malam")
	);
};

const isTrivialTurn = (text: string): boolean => {
	const t = text.toLowerCase().trim();
	if (isEllipsisOnlyTurn(t)) return false;
	if (CRITICAL_KEYWORDS.some((k) => t.includes(k))) return false;
	if (CONTEXT_KEYWORDS.some((k) => t.includes(k))) return false;

	const wordCount = t.split(/\s+/).filter(Boolean).length;
	if (wordCount > 3 || t.length > 18) return false;

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
		/(?:\bmy name is\b|\bcall me\b)\s+([A-Za-z][A-Za-z.'-]{1,24}(?:\s+[A-Za-z][A-Za-z.'-]{1,24}){0,2})/i,
		/(?:\bnama saya\b|\bnamaku\b|\bpanggil aku\b|\bpanggil saya\b)\s+([A-Za-z][A-Za-z.'-]{1,24}(?:\s+[A-Za-z][A-Za-z.'-]{1,24}){0,2})/i,
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
			"capek",
			"sedih",
			"baik",
			"oke",
			"pusing",
			"takut",
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

const buildMiniFallbackResult = (userMessage: string): MiniBrainResult => {
	const isCrisis = /suicide|suicidal|mati|bunuh|kill|end it|sakit/i.test(
		userMessage
	);

	return {
		summaryDelta: "",
		mood: "mixed",
		riskLevel: isCrisis ? 4 : 0,
		themes: isCrisis ? ["safety_threat"] : [],
		suggestedAction: isCrisis ? "escalate" : "normal",
		requiresCounselor: isCrisis ? true : false,
	};
};

const buildSystemInstruction = (c: {
	mood: string;
	riskLevel: number;
	mode: "support" | "companion";
	stateDelta: StateDelta;
	languagePlan: {
		sentenceLength: "short" | "mixed" | "long";
		rawness: "low" | "medium" | "high";
		metaphorDensityHint: "low" | "medium" | "high";
		abstractionHint: "concrete" | "mixed" | "abstract";
		profanityTolerance: "none" | "light" | "match";
	};
	decision: {
		responseClass: "understanding" | "reflection" | "anchoring" | "grounding";
		groundingEligible: boolean;
		groundingReason: string | null;
	};
}) =>
	`
	${BASE_PERSONA}

	# IDENTITY (NON-NEGOTIABLE)
    You are Marmalade.
    Marmalade is not a product, object, or metaphorical term.
    Marmalade is the persistent witness that listens, remembers, and maintains continuity across conversations.
    You do not redefine or explain yourself differently based on user tone, jokes, or external meanings of the word.
	
	# CORE THESIS
	Restore the user’s fragmented inner story.
	No pep talk, no forced positivity, no “just move on.”
	Do memory re-linking, reactivate experiences, surface agency.
	
	# TOP-LEVEL DIRECTIVE
	Help the user remember why they once wanted to live by rebuilding inner conditions that made it real.
	Focus on reflection and memory, not persuasion or motivational rhetoric.
	
	# ARCHITECTURAL ROLE
	Second layer: The "First Response" has already acknowledged the user.
	- **DO NOT** repeat what the user just said. Synthesize the *meaning*, don't parrot the words.
	- Bridge the first thought into deeper reflection or memory link.
	- If the first layer handled greetings/small-talk, respond lightly and stop.
	
	# CONTEXT
	Mood: ${c.mood}
	Risk: ${c.riskLevel}
	Mode: ${c.mode}
	Detected State Delta: ${JSON.stringify(c.stateDelta)}
	Intervention: ${JSON.stringify(c.decision)}
	
	# LANGUAGE & FLOW
	- **Anti-Stutter**: Write clean, complete sentences. Use standard punctuation. Only use "..." for a trailing thought at the very end.
	- Mirror rawness and slang.
	- ${JSON.stringify(c.languagePlan)}
	
	# HARD RULES
	- No templates, generic empathy, or polished therapy phrases.
	- **Calibration**: If the user input is short/neutral (e.g. "hello", "good morning", "not much"), stay light. Do NOT psychoanalyze a greeting.
	- **State Delta**: Reference the detected state delta ONLY when it is meaningful/clear. If the delta is unclear / missing / "no_current_read", do not invent psychological shifts.
	- Somatic/phenomenology questions ONLY if the user expressed distress/emotion in this turn.
	- Grounding only if groundingEligible true.
	- Do NOT add a somatic question on neutral/small-talk turns.
	- No markdown or bolding. Do NOT greet (the first layer handled greetings).
	
	# SUICIDALITY HANDLING
	Treat ideation as narrative collapse, not desire for death.
	Stabilize story → re-anchor identity → surface agency → address safety.
	No life arguments, no moralizing, no hope-selling.
	
	# OUTPUT
	- Produce a single coherent response aligned with "responseClass".
	- Say only what advances reflection, anchoring, or grounding for this turn.
	- Stop immediately once the core thought is delivered.
	- Ask a somatic question only if:
	  - the user expressed distress in this turn, AND
	  - groundingEligible is true.
	- Silence is preferable to over-explaining.
	`.trim();

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

		const previousMood = normalizeMood(conversationState.mood);
		const basePrefs = asObject(conversationState.preferences) ?? {};
		const prefs = mergePreferencesWithImmediateFacts(basePrefs, userMessage);
		if (isEllipsisOnlyTurn(userMessage.trim().toLowerCase())) {
			const replyText = "I'm here.";
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
		let mini: MiniBrainResult;
		try {
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
		} catch (err) {
			if (isMiniValidationError(err)) {
				console.warn(
					"[Turn] MiniBrain validation failed, using fallback.",
					err
				);
			} else if (err instanceof AppError) {
				throw err;
			} else {
				console.warn("[Turn] Analysis failed, using fallback.", err);
			}
			mini = buildMiniFallbackResult(userMessage);
		}

		if (mini.requiresCounselor === false) {
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

		const mood = normalizeMood(mini.mood);

		emitter.emit("phase", { phase: "recalling", mood });
		const safetyMode = this.getSafetyMode(mini.riskLevel);
		const relevant = await retrievePromise;

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
		userMessage: string,
		replyText: string,
		mini: any,
		voiceMode: string,
		state: any,
		relevantDocs: any = []
	): Promise<void> {
		await db.transaction(async (tx) => {
			const nextSummary = [state?.summary, mini?.summaryDelta]
				.filter(Boolean)
				.join("\n");
			const basePrefs = asObject(state?.preferences) ?? {};
			const prefs = mergePreferencesWithImmediateFacts(basePrefs, userMessage);

			await this.states.upsert(
				{
					userId,
					summary: nextSummary || state.summary,
					mood: normalizeMood(mini.mood),
					riskLevel: mini.riskLevel,
					lastThemes: mini.themes,
					baselineDepression: state.baselineDepression,
					baselineAnxiety: state.baselineAnxiety,
					baselineStress: state.baselineStress,
					preferences: prefs,
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
		const dataPromise = Promise.allSettled([
			this.sessions.findById(sessionId),
			this.states.getByUserId(userId),
			this.messages.listRecentBySession(sessionId, 5),
		]);

		const dataResults = await dataPromise;

		const isStandalone =
			isTrivialTurn(userMessage) || isGreetingTurn(userMessage);

		let miniPromise: Promise<any> | null = null;
		let ragPromise: Promise<any> | null = null;
		if (!isStandalone) {
			miniPromise = this.miniBrain
				.analyzeTurn({
					userMessage,
					recentMessages: [],
					currentState: {},
				})
				.catch((error) => {
					if (isMiniValidationError(error)) {
						console.warn(
							"[Turn][stream] MiniBrain validation failed, sending fallback",
							error
						);
						return buildMiniFallbackResult(userMessage);
					}
					throw error;
				});

			ragPromise = this.embeddingRepo.findRelevant(userId, userMessage, 3);
		}
		const sessionRes =
			dataResults[0]?.status === "fulfilled" ? dataResults[0].value : null;
		const stateRes =
			dataResults[1]?.status === "fulfilled" ? dataResults[1].value : null;

		if (!sessionRes || sessionRes.userId !== userId) {
			throw new AppError("Session not found", 404);
		}

		if (isEllipsisOnlyTurn(userMessage.trim().toLowerCase())) {
			const replyText = "I'm here.";
			yield { text: replyText, voiceMode: "comfort" };

			const prefs = asObject((stateRes as any)?.preferences) ?? {};
			const baseGraph = ensureGraph(prefs.userStateGraph);
			const miniDummy = buildMiniFallbackResult(userMessage);
			try {
				await this.saveTurnAsync(
					userId,
					sessionId,
					userMessage,
					replyText,
					miniDummy,
					"comfort",
					{ ...stateRes, preferences: { ...prefs, userStateGraph: baseGraph } },
					[]
				);
			} catch (err) {
				console.error("Failed to save ellipsis short-circuit turn:", err);
			}
			return;
		}

		if (isGreetingTurn(userMessage)) {
			const replyText =
				"Hello! I'm here to listen whenever you're ready to share.";
			yield { text: replyText, voiceMode: "comfort" };

			const prefs = asObject((stateRes as any)?.preferences) ?? {};
			const baseGraph = ensureGraph(prefs.userStateGraph);
			const miniDummy = buildMiniFallbackResult(userMessage);
			try {
				await this.saveTurnAsync(
					userId,
					sessionId,
					userMessage,
					replyText,
					miniDummy,
					"comfort",
					{ ...stateRes, preferences: { ...prefs, userStateGraph: baseGraph } },
					[]
				);
			} catch (err) {
				console.error("Failed to save greeting short-circuit turn:", err);
			}
			return;
		}

		const userName = (stateRes as any)?.preferences?.name || "Friend";
		const prefs = asObject((stateRes as any)?.preferences) ?? {};
		const baseGraph = ensureGraph(prefs.userStateGraph);
		const baseSignals = (asObject(prefs.stateMappingSignals) ??
			null) as StateMappingSignals | null;

		const firstResponseStream =
			this.firstResponseBrain.generateFirstResponseStream({
				userMessage,
				userName,
				mode: detectCompanionRequest(userMessage) ? "companion" : "support",
				riskLevel: 0,
				companionRequested: detectCompanionRequest(userMessage),
				isStandalone: isStandalone,
			});

		let firstResponseFullText = "";

		let firstResponseUsage = {
			inputTokens: 0,
			outputTokens: 0,
			totalTokens: 0,
		};
		let firstResponseUsageSeen = false;
		const recentMessages =
			dataResults[2].status === "fulfilled" ? dataResults[2].value : [];

		if (isStandalone) {
			for await (const item of firstResponseStream as AsyncIterable<any>) {
				const chunk = item?.text ?? item;
				const usage = item?.usage;
				if (typeof chunk === "string" && chunk.length) {
					firstResponseFullText += chunk;
					yield { text: chunk, voiceMode: "comfort" };
				}
				if (usage) {
					firstResponseUsageSeen = true;
					firstResponseUsage.inputTokens += (usage.inputTokens ?? 0) as number;
					firstResponseUsage.outputTokens += (usage.outputTokens ??
						0) as number;
					firstResponseUsage.totalTokens += (usage.totalTokens ?? 0) as number;
				}
			}

			const finalContent = firstResponseFullText.trim();

			const miniDummy = {
				summaryDelta: "",
				mood: "mixed",
				riskLevel: 0,
				themes: [],
				suggestedAction: "normal",
				requiresCounselor: false,
			};
			try {
				await this.saveTurnAsync(
					userId,
					sessionId,
					userMessage,
					finalContent,
					miniDummy,
					"comfort",
					{ ...stateRes, preferences: { ...prefs, userStateGraph: baseGraph } },
					[]
				);
			} catch (err) {
				console.error("Failed to save trivial turn:", err);
			}

			return;
		}

		const quickCoordinated = coordinateTurn({
			userMessage,
			graph: baseGraph,
			signals: baseSignals,
		});
		const quickRiskLevel = (stateRes as any)?.riskLevel ?? 0;
		const quickMood = (stateRes as any)?.mood ?? "mixed";
		const quickThemes = (stateRes as any)?.lastThemes ?? [];
		const quickSystemInstruction = buildSystemInstruction({
			mood: quickMood,
			riskLevel: quickRiskLevel,
			mode: detectCompanionRequest(userMessage) ? "companion" : "support",
			stateDelta: quickCoordinated.delta,
			languagePlan: quickCoordinated.languagePlan,
			decision: quickCoordinated.decision,
		});

		let proResponseFullText = "";
		let proStart = Date.now();
		let proFirstChunkAt: number | null = null;
		let counselorUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
		let counselorUsageSeen = false;
		let counselorStarted = false;
		let counselorIterator: {
			next: () => Promise<IteratorResult<any, any>>;
		} | null = null;
		let counselorNext: Promise<IteratorResult<any, any>> | null = null;

		const thresholdWords = 8;
		let emittedWordCount = 0;
		const countWords = (s: string) =>
			s.trim().split(/\s+/).filter(Boolean).length;

		const startCounselor = () => {
			if (counselorStarted) return;
			counselorStarted = true;

			const history = (recentMessages as any[])
				.map((m) => ({ role: m.role, content: m.content }))
				.reverse()
				.concat([{ role: "assistant", content: firstResponseFullText }]);

			const stream = this.counselorBrain.generateReplyTextStream({
				conversationWindow: history,
				summary: (stateRes as any)?.summary ?? null,
				relevantDocs: [],
				systemInstruction: quickSystemInstruction,
				mood: quickMood,
				riskLevel: quickRiskLevel,
				themes: Array.isArray(quickThemes) ? quickThemes : [],
				safetyMode: this.getSafetyMode(quickRiskLevel),
				preferences: { ...prefs, userStateGraph: quickCoordinated.nextGraph },
			});

			const iterator = (stream as any)[Symbol.asyncIterator]();
			counselorIterator = iterator;
			proStart = Date.now();
			proFirstChunkAt = null;
			counselorUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
			counselorUsageSeen = false;
			counselorNext = iterator.next();
		};

		const firstIterator = (firstResponseStream as AsyncIterable<any>)[
			Symbol.asyncIterator
		]();
		let firstNext: Promise<IteratorResult<any, any>> | null =
			firstIterator.next();

		const finalizeAndSaveAsync = (finalContent: string) => {
			(async () => {
				let mini: any;
				let relevantDocs: any;
				try {
					[mini, relevantDocs] = await Promise.all([miniPromise, ragPromise]);
				} catch (_e) {
					console.warn("[Turn] Analysis failed, using fallback.");
					mini = {
						summaryDelta: "",
						mood: "mixed",
						riskLevel: 0,
						themes: [],
						suggestedAction: "normal",
					};
					relevantDocs = [];
				}

				const coordinated = coordinateTurn({
					userMessage,
					graph: baseGraph,
					signals: baseSignals,
				});

				await this.saveTurnAsync(
					userId,
					sessionId,
					userMessage,
					finalContent,
					mini,
					"comfort",
					{
						...stateRes,
						preferences: { ...prefs, userStateGraph: coordinated.nextGraph },
					},
					relevantDocs
				);
			})().catch((err) => console.error("Save failed", err));
		};

		try {
			while (firstNext || counselorNext) {
				const races: Array<Promise<{ src: "first" | "counselor"; r: any }>> =
					[];
				if (firstNext)
					races.push(firstNext.then((r) => ({ src: "first" as const, r })));
				if (counselorNext)
					races.push(
						counselorNext.then((r) => ({ src: "counselor" as const, r }))
					);

				const winner = await Promise.race(races);

				if (winner.src === "first") {
					firstNext = null;
					if (winner.r?.done) {
						if (!counselorStarted) {
							if (miniPromise) {
								let miniResult: any;
								try {
									miniResult = await miniPromise;
								} catch (err) {
									console.warn(
										"[Turn][stream] MiniBrain failed during decision, allowing counselor by default.",
										err
									);
									miniResult = { requiresCounselor: true };
								}
								if (miniResult.requiresCounselor === false) {
									finalizeAndSaveAsync(firstResponseFullText);
									return;
								}
							}
							startCounselor();
						}
						firstNext = null;
					} else {
						const item = winner.r.value;
						const chunk = item?.text ?? item;
						const usage = item?.usage;
						if (typeof chunk === "string" && chunk.length) {
							firstResponseFullText += chunk;
							emittedWordCount += countWords(chunk);
							yield { text: chunk, voiceMode: "comfort" };
						}
						if (usage) {
							firstResponseUsageSeen = true;
							firstResponseUsage.inputTokens += (usage.inputTokens ??
								0) as number;
							firstResponseUsage.outputTokens += (usage.outputTokens ??
								0) as number;
							firstResponseUsage.totalTokens += (usage.totalTokens ??
								0) as number;
						}

						if (!counselorStarted && emittedWordCount >= thresholdWords) {
							if (miniPromise) {
								let miniResult: any;
								try {
									miniResult = await miniPromise;
								} catch (err) {
									console.warn(
										"[Turn][stream] MiniBrain failed during decision, allowing counselor by default.",
										err
									);
									miniResult = { requiresCounselor: true };
								}
								if (miniResult.requiresCounselor === false) {
									finalizeAndSaveAsync(firstResponseFullText);
									return;
								}
							}
							startCounselor();
						}

						if (firstIterator && !counselorNext) {
							firstNext = firstIterator.next();
						} else if (!counselorStarted) {
							firstNext = firstIterator.next();
						} else {
							firstNext = firstIterator.next();
						}
					}
				}

				if (winner.src === "counselor") {
					counselorNext = null;
					if (winner.r?.done) {
						break;
					}

					try {
						await firstIterator.return?.();
					} catch {
						// ignore
					}
					firstNext = null;

					const item = winner.r.value;
					const chunkText = item?.text ?? item;
					const usage = item?.usage;
					if (typeof chunkText === "string" && chunkText.length) {
						if (!proFirstChunkAt) proFirstChunkAt = Date.now();
						proResponseFullText += chunkText;
						yield { text: chunkText, voiceMode: "comfort" };
					}
					if (usage) {
						counselorUsageSeen = true;
						counselorUsage.inputTokens += (usage.inputTokens ?? 0) as number;
						counselorUsage.outputTokens += (usage.outputTokens ?? 0) as number;
						counselorUsage.totalTokens += (usage.totalTokens ?? 0) as number;
					}

					{
						const iterator = counselorIterator as any;
						counselorNext =
							typeof iterator?.next === "function" ? iterator.next() : null;
					}
				}
			}
		} catch (err) {
			console.error("Turn streaming failed:", err);
			if (!firstResponseFullText) {
				firstResponseFullText = EMERGENCY_PACKET.replyText;
				yield { text: firstResponseFullText, voiceMode: "comfort" };
			}
		}

		const finalContent = (
			firstResponseFullText +
			" " +
			proResponseFullText
		).trim();
		finalizeAndSaveAsync(finalContent);
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
			console.warn(
				"Failed to fetch state mapping context for session summary",
				e
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

	private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
		let timeoutHandle: NodeJS.Timeout | null = null;
		const timeoutPromise = new Promise<T>((resolve) => {
			timeoutHandle = setTimeout(() => resolve(EMERGENCY_PACKET as T), ms);
		});

		try {
			return await Promise.race([promise, timeoutPromise]);
		} catch (error) {
			console.error("Counselor agent failed, using emergency packet", error);
			return EMERGENCY_PACKET as T;
		} finally {
			if (timeoutHandle) clearTimeout(timeoutHandle);
		}
	}
}
