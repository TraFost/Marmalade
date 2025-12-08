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
		const recent = input.recentMessages.slice(-12);
		return [
			"You are a mental health turn analyzer.",
			"Given the latest user message, a short conversation window, and current state, return strict JSON.",
			"Respond with ONLY JSON matching this shape:",
			JSON.stringify(
				{
					summaryDelta:
						"A 1-2 sentence update describing what changed in this turn.",
					overallSummary: "Optional refreshed summary string or null",
					mood: "calm|sad|anxious|angry|numb|mixed",
					riskLevel: "integer 0-5 where 5 is imminent self-harm",
					themes: ["theme1", "theme2"],
					suggestedAction: "normal|grounding_needed|escalate",
				},
				null,
				2
			),
			"Input:",
			`User message: ${input.userMessage}`,
			`Recent messages: ${JSON.stringify(recent)}`,
			`Current state: ${JSON.stringify(input.currentState)}`,
			`Latest screening summary (if any): ${JSON.stringify(
				input.currentState.screening ?? null
			)}`,
		].join("\n");
	}
}
