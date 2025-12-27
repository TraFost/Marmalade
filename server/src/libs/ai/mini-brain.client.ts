import { VertexAI } from "@google-cloud/vertexai";
import { z, ZodError } from "zod";
import { logger } from "../logger";
import { AppError } from "../helper/error.helper";

import { env } from "../../configs/env.config";

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
	mood: string;
	riskLevel: number;
	themes: string[];
	suggestedAction: "normal" | "grounding_needed" | "escalate";
	requiresCounselor: boolean;
};

const miniResponseSchema = z.object({
	summaryDelta: z.string().optional().default(""),
	mood: z.string().optional().default("mixed"),
	riskLevel: z.number().int().min(0).max(4).catch(0),
	themes: z.array(z.string()).optional().default([]),
	suggestedAction: z
		.enum(["normal", "grounding_needed", "escalate"])
		.optional()
		.default("normal"),
	requiresCounselor: z
		.preprocess(
			(val) => (typeof val === "string" ? val === "true" : val),
			z.boolean()
		)
		.optional()
		.default(true),
});

const MINI_OUTPUT_SCHEMA = `{
	"summaryDelta": "optional 1 short sentence update",
	"mood": "calm|sad|anxious|angry|numb|mixed",
	"riskLevel": 0-4,
	"themes": ["theme1"],
	"suggestedAction": "normal|grounding_needed|escalate",
	"requiresCounselor": true or false (boolean, not string)
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
			logger.info(
				{
					candidates: (tokenMeta?.candidates ?? []).length,
					metadata: (tokenMeta as any)?.metadata ?? null,
				},
				"[AI][Mini] Vertex response (trimmed)"
			);
			const usage = extractTokenUsage(res);
			if (usage) logger.info({ usage }, "[AI][Mini] token usage");
		} catch (logErr) {
			logger.warn({ logErr }, "[AI][Mini] Failed to log Vertex response");
		}

		const raw = res.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (error) {
			logger.warn(
				{ error: (error as Error).message, raw },
				"[AI][Mini] Failed to parse JSON from MiniBrain"
			);
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
				logger.warn(
					{ issues: err.issues, raw },
					"[AI][Mini] MiniBrain response failed validation"
				);
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
			"You are a strict JSON classifier.",
			"Return ONLY strict JSON that matches the schema below (no extra keys).",
			MINI_OUTPUT_SCHEMA,
			"",
			"# CLASSIFICATION",
			"- riskLevel 4: imminent / explicit plan+intent. 3: plan/intent. 2: ideation without plan. 1: passive self-harm language. 0: fleeting dark thoughts.",
			"- If the message is ONLY a greeting/small-talk (e.g., 'good morning', 'hi'), use riskLevel 0, themes [], suggestedAction 'normal', summaryDelta ''.",
			"",
			"# GUARDRAILS",
			"- Keep themes short (1-3 words each).",
			"- summaryDelta must be ONE sentence.",
			"",
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
