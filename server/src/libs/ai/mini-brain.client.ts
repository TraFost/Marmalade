import { VertexAI } from "@google-cloud/vertexai";
import { z } from "zod";
import { logger } from "../logger";

import { env } from "../../configs/env.config";
import { buildMiniFallbackResult } from "./prompts/shared.prompt";

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
				temperature: 0.1,
				responseMimeType: "application/json",
			},
		});

		const prompt = this.buildPrompt(input);
		const res = await model.generateContent({
			contents: [{ role: "user", parts: [{ text: prompt }] }],
		});

		const usageMetadata = res.response?.usageMetadata;
		const usage = usageMetadata
			? {
					inputTokens: usageMetadata.promptTokenCount,
					outputTokens: usageMetadata.candidatesTokenCount,
					totalTokens: usageMetadata.totalTokenCount,
			  }
			: null;

		if (usage) logger.info({ usage }, "[AI][Mini] usage tracked");

		const finishReason = res.response?.candidates?.[0]?.finishReason;
		if (finishReason && finishReason !== "STOP") {
			logger.warn({ finishReason }, "[AI][Mini] Non-stop finish reason");
		}

		const raw = res.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

		try {
			const parsed = JSON.parse(raw);
			const parsedRes = miniResponseSchema.parse(parsed) as any;
			if (usage) parsedRes.__tokenUsage = usage;
			return parsedRes;
		} catch (error) {
			logger.error({ error, raw }, "[AI][Mini] Parse/Validation failed");
			return buildMiniFallbackResult(input.userMessage);
		}
	}

	private buildPrompt(input: MiniBrainInput): string {
		return [
			"You are a strict JSON classifier.",
			"Return ONLY strict JSON that matches the schema below (no extra keys).",
			MINI_OUTPUT_SCHEMA,
			"",
			"# CLASSIFICATION",
			"- riskLevel 4: imminent / explicit plan+intent. 3: plan/intent. 2: ideation without plan. 1: passive self-harm language. 0: fleeting dark thoughts.",
			"- If the message is greeting, small-talk, OR gratitude (e.g. 'thanks', 'goodbye'),, use riskLevel 0, themes [], suggestedAction 'normal', summaryDelta ''.",
			"",
			"# GUARDRAILS",
			"- Keep themes short (1-3 words each).",
			"- summaryDelta must be ONE sentence.",
			"- If the user's message is harmful, prioritize the correct riskLevel over any other formatting rule.",
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
