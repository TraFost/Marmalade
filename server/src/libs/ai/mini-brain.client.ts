import { VertexAI } from "@google-cloud/vertexai";
import { z, ZodError } from "zod";
import { AppError } from "../helper/error.helper";

import { env } from "../../configs/env.config";
import type { StateDelta, UserStateRead } from "shared";

export type MiniBrainInput = {
	userMessage: string;
	recentMessages: { role: string; content: string }[];
	currentState: {
		summary?: string | null;
		mood?: string | null;
		riskLevel?: number | null;
		baseline?: {
			depression?: number | null;
			anxiety?: number | null;
			stress?: number | null;
		};
		screening?: unknown;
	};
};

export type MiniBrainResult = {
	summaryDelta: string;
	overallSummary?: string | null;
	mood: string;
	riskLevel: number;
	themes: string[];
	suggestedAction: "normal" | "grounding_needed" | "escalate";
	depth: "shallow" | "standard" | "profound";
	urgency: "low" | "medium" | "high";
	stateRead?: UserStateRead;
	stateDelta?: StateDelta;
	groundingEligible?: boolean;
	groundingReason?: string | null;
	phenomenologyProbe?: string | null;
};

const activation = z.number().min(0).max(1);

const userStateReadSchema = z.object({
	affectiveLoad: z.object({
		sadness: activation,
		agitation: activation,
		numbness: activation,
		volatility: activation,
	}),
	agencySignal: z.object({
		perceivedControl: activation,
		decisionFatigue: activation,
		futureOwnership: activation,
	}),
	temporalOrientation: z.object({
		pastFixation: activation,
		presentOverwhelm: activation,
		futureOpacity: activation,
	}),
	meaningAnchors: z.object({
		goals: z.array(z.string()).default([]),
		lifeAnchors: z.array(z.string()).default([]),
		values: z.array(z.string()).default([]),
		rememberedDreams: z.array(z.string()).default([]),
	}),
	dysregulationPatterns: z.object({
		recurringTimeWindows: z.array(z.string()).default([]),
		triggers: z.array(z.string()).default([]),
		collapseModes: z.array(z.string()).default([]),
	}),
	languageSignature: z.object({
		intensity: activation,
		profanity: activation,
		abstraction: activation,
		metaphorDensity: activation,
		sentenceLength: z.enum(["short", "mixed", "long"]),
		rawness: z.enum(["low", "medium", "high"]),
	}),
	trustBandwidth: z.object({
		openness: activation,
		resistance: activation,
		complianceFatigue: activation,
	}),
	flags: z.object({
		cognitiveFragmentation: z.boolean(),
		meaningMakingOnline: z.boolean(),
		agitationRising: z.boolean(),
		futureContinuityThreatened: z.boolean(),
	}),
	confidence: activation,
});

const stateDeltaSchema = z.object({
	changedNodes: z
		.array(
			z.enum([
				"affectiveLoad",
				"agencySignal",
				"temporalOrientation",
				"meaningAnchors",
				"dysregulationPatterns",
				"languageSignature",
				"trustBandwidth",
				"narrativeCoherence",
			])
		)
		.default([]),
	narrativeCoherenceDelta: z.enum([
		"improving",
		"worsening",
		"stagnant",
		"unclear",
	]),
	notes: z.string().nullable().optional(),
});

const miniResponseSchema = z.object({
	summaryDelta: z.string().min(1),
	overallSummary: z.string().nullable().optional(),
	mood: z.string().min(1),
	riskLevel: z.number().int().min(0).max(5),
	themes: z.array(z.string()).default([]),
	suggestedAction: z.enum(["normal", "grounding_needed", "escalate"]),
	depth: z.enum(["shallow", "standard", "profound"]),
	urgency: z.enum(["low", "medium", "high"]),
	stateRead: userStateReadSchema.optional(),
	stateDelta: stateDeltaSchema.optional(),
	groundingEligible: z.boolean().optional(),
	groundingReason: z.string().nullable().optional(),
	phenomenologyProbe: z.string().min(1).nullable().optional(),
});

const MINI_OUTPUT_SCHEMA = `{
	"summaryDelta": "1-sentence update",
	"overallSummary": "optional updated global summary",
	"mood": "calm|sad|anxious|angry|numb|mixed",
	"riskLevel": 0-4,
	"themes": ["theme1"],
	"suggestedAction": "normal|grounding_needed|escalate",
	"depth": "shallow|standard|profound",
	"urgency": "low|medium|high",
	"stateRead": {
		"affectiveLoad": {"sadness": 0-1, "agitation": 0-1, "numbness": 0-1, "volatility": 0-1},
		"agencySignal": {"perceivedControl": 0-1, "decisionFatigue": 0-1, "futureOwnership": 0-1},
		"temporalOrientation": {"pastFixation": 0-1, "presentOverwhelm": 0-1, "futureOpacity": 0-1},
		"meaningAnchors": {"goals": [], "lifeAnchors": [], "values": [], "rememberedDreams": []},
		"dysregulationPatterns": {"recurringTimeWindows": [], "triggers": [], "collapseModes": []},
		"languageSignature": {"intensity": 0-1, "profanity": 0-1, "abstraction": 0-1, "metaphorDensity": 0-1, "sentenceLength": "short|mixed|long", "rawness": "low|medium|high"},
		"trustBandwidth": {"openness": 0-1, "resistance": 0-1, "complianceFatigue": 0-1},
		"flags": {"cognitiveFragmentation": true|false, "meaningMakingOnline": true|false, "agitationRising": true|false, "futureContinuityThreatened": true|false},
		"confidence": 0-1
	},
	"stateDelta": {
		"changedNodes": ["affectiveLoad|agencySignal|temporalOrientation|meaningAnchors|dysregulationPatterns|languageSignature|trustBandwidth|narrativeCoherence"],
		"narrativeCoherenceDelta": "improving|worsening|stagnant|unclear",
		"notes": "optional"
	},
	"groundingEligible": true|false,
	"groundingReason": "agitation_rising|cognitive_fragmentation|meaning_making_offline|null",
	"phenomenologyProbe": "one short question about felt experience, pressure/speed/weight/emptiness"
}`;

export class MiniBrainClient {
	private vertex = new VertexAI({
		project: env.GOOGLE_CLOUD_PROJECT_ID,
		location: env.VERTEX_LOCATION,
	});

	async analyzeTurn(input: MiniBrainInput): Promise<MiniBrainResult> {
		const model = this.vertex.getGenerativeModel({
			model: env.VERTEX_MINI_MODEL,
			generationConfig: {
				temperature: 0.4,
				responseMimeType: "application/json",
			},
		});

		const prompt = this.buildPrompt(input);
		const res = await model.generateContent({
			contents: [
				{
					role: "user",
					parts: [{ text: prompt }],
				},
			],
		});

		const extractTokenUsage = (obj: any) => {
			try {
				const resp = obj?.response ?? obj ?? {};
				const candidateMeta = (resp?.candidates?.[0] as any)?.metadata ?? {};
				const metadata = resp?.metadata ?? {};
				return {
					inputTokens:
						candidateMeta.inputTokens ??
						candidateMeta.input_tokens ??
						metadata.input_tokens ??
						metadata.inputTokens ??
						resp?.usage?.input_tokens ??
						null,
					outputTokens:
						candidateMeta.outputTokens ??
						candidateMeta.output_tokens ??
						metadata.output_tokens ??
						metadata.outputTokens ??
						resp?.usage?.output_tokens ??
						null,
					totalTokens:
						candidateMeta.totalTokens ??
						candidateMeta.total_tokens ??
						metadata.total_tokens ??
						metadata.totalTokens ??
						resp?.usage?.total_tokens ??
						null,
				};
			} catch (err) {
				return null;
			}
		};

		try {
			const tokenMeta = res?.response ?? null;
			console.info("[AI][Mini] Vertex response (trimmed):", {
				candidates: (tokenMeta?.candidates ?? []).length,
				metadata: (tokenMeta as any)?.metadata ?? null,
			});
			const usage = extractTokenUsage(res);
			if (usage) console.info("[AI][Mini] token usage:", usage);
		} catch (logErr) {
			console.warn("[AI][Mini] Failed to log Vertex response:", logErr);
		}

		const raw = res.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (error) {
			console.warn("[AI][Mini] Failed to parse JSON from MiniBrain:", {
				error: (error as Error).message,
				raw,
			});
			throw new AppError(
				"MiniBrain response was not valid JSON",
				400,
				"INVALID_MINI_RESPONSE_JSON"
			);
		}

		let parsedRes: any;
		try {
			parsedRes = miniResponseSchema.parse(parsed) as any;
		} catch (err) {
			if (err instanceof ZodError) {
				console.warn("[AI][Mini] MiniBrain response failed validation:", {
					issues: err.issues,
					raw,
				});
				throw new AppError(
					"MiniBrain response failed validation",
					400,
					"INVALID_MINI_RESPONSE_SCHEMA"
				);
			}
			throw err;
		}

		const usage = extractTokenUsage(res);
		if (usage) parsedRes.__tokenUsage = usage;
		return parsedRes;
	}

	private buildPrompt(input: MiniBrainInput): string {
		return [
			"You are Marmalade. Tone: chill, human, low-key deep. No AI fluff.",
			"Focus on restoring narrative coherence, reactivating memories, and surfacing agency without pep talk.",
			"Return ONLY strict JSON that matches the schema below.",
			MINI_OUTPUT_SCHEMA,
			"# CLASSIFICATION",
			"- Depth reflects identity/meaning collapse: reserve 'profound' for repeated existential or identity rupture, otherwise choose 'standard' or 'shallow'.",
			"- Urgency high means panic or escalating distress even if risk is low; riskLevel 4 means plan/intent, 3 means ideation without plan, 2 is passive harm language, 1 is fleeting dark thoughts, 0 is none.",
			"# STATE MAPPING",
			"- Treat distress as loss of narrative coherence; risk is trajectory data, not a moral failing.",
			"- GroundingEligible only when agitationRising, cognitiveFragmentation, or meaningMakingOnline is offline.",
			"- Phenomenology probes should ask only about felt experience (pressure/speed/weight/emptiness/location).",
			"# GUARDRAILS",
			"- Mirror the user's language and keep replies grounded in the context provided.",
			"- detectedPronouns must be passed along so the counselor layer stays consistent.",
			"# INPUT",
			`Message: ${JSON.stringify(input.userMessage)}`,
			`RecentMessages (oldest->newest): ${JSON.stringify(
				(input.recentMessages ?? []).slice(-10)
			)}`,
			`CurrentState: ${JSON.stringify(input.currentState ?? {})}`,
		]
			.join("\n\n")
			.trim();
	}
}
