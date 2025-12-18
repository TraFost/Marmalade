import { VertexAI } from "@google-cloud/vertexai";
import { z } from "zod";

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
	overallSummary?: string | null;
	mood: string;
	riskLevel: number;
	themes: string[];
	suggestedAction: "normal" | "grounding_needed" | "escalate";
};

const miniResponseSchema = z.object({
	summaryDelta: z.string().min(1),
	overallSummary: z.string().nullable().optional(),
	mood: z.string().min(1),
	riskLevel: z.number().int().min(0).max(5),
	themes: z.array(z.string()).default([]),
	suggestedAction: z.enum(["normal", "grounding_needed", "escalate"]),
});

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

		const raw = res.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (error) {
			throw new Error(`MiniBrain response was not valid JSON: ${raw}`);
		}

		return miniResponseSchema.parse(parsed);
	}

	private buildPrompt(input: MiniBrainInput): string {
		return `
	Analyze this turn for a mental health AI.
	Be extremely brief. Return ONLY JSON.

	Schema:
	{
		"delta": "Brief summary",
		"mood": "calm|sad|anxious|angry|numb|mixed",
		"risk": 0-5,
		"action": "normal|grounding|escalate"
	}

	Input:
	Message: "${input.userMessage}"
	Context: ${JSON.stringify(input.currentState.summary)}
	`.trim();
	}
}
