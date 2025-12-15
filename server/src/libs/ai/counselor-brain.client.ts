import { VertexAI } from "@google-cloud/vertexai";
import { z } from "zod";

import { env } from "../../configs/env.config";

export type CounselorBrainInput = {
	conversationWindow: { role: string; content: string }[];
	summary?: string | null;
	mood?: string | null;
	riskLevel: number;
	themes: string[];
	baseline?: {
		depression?: number | null;
		anxiety?: number | null;
		stress?: number | null;
	};
	relevantDocs?: { source: string; content: string; type?: string | null }[];
	safetyMode: "normal" | "caution" | "high_caution" | "crisis";
	preferences?: Record<string, unknown> | null;
	systemInstruction: string;
};

export type CounselorBrainResult = {
	replyText: string;
	voiceMode: "comfort" | "coach" | "educational" | "crisis";
	suggestedExercise?: string | null;
	tags?: string[];
};

const counselorResponseSchema = z.object({
	replyText: z.string().min(1),
	voiceMode: z.enum(["comfort", "coach", "educational", "crisis"]),
	suggestedExercise: z.string().nullable().optional(),
	tags: z.array(z.string()).default([]),
});

export class CounselorBrainClient {
	private vertex = new VertexAI({
		project: env.GOOGLE_CLOUD_PROJECT_ID,
		location: env.VERTEX_LOCATION,
	});

	async generateReply(
		input: CounselorBrainInput
	): Promise<CounselorBrainResult> {
		const model = this.vertex.getGenerativeModel({
			model: env.VERTEX_COUNSELOR_MODEL,
			systemInstruction: {
				parts: [{ text: input.systemInstruction }],
				role: "system",
			},
			generationConfig: {
				temperature: 0.7,
				responseMimeType: "application/json",
			},
		});

		const prompt = this.buildContextPrompt(input);

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
		} catch (_error) {
			console.error("CounselorBrain JSON Parse Error. Raw:", raw);
			throw new Error(`CounselorBrain response was not valid JSON`);
		}

		return counselorResponseSchema.parse(parsed);
	}

	private buildContextPrompt(input: CounselorBrainInput): string {
		const recent = input.conversationWindow.slice(-12);
		const docContext = (input.relevantDocs ?? []).map((d) => ({
			source: d.source,
			content: d.content?.slice(0, 800),
			type: d.type,
		}));

		return [
			"Based on the SYSTEM INSTRUCTIONS provided, generate a response for the following user context.",
			"Respond ONLY with the JSON schema requested.",

			"--- CONTEXT DATA ---",
			`User Summary: ${input.summary ?? "None"}`,
			`Current Mood: ${input.mood ?? "unknown"}`,
			`Risk Level: ${input.riskLevel} (Safety Mode: ${input.safetyMode})`,
			`Themes: ${JSON.stringify(input.themes)}`,
			`Baseline Stats: ${JSON.stringify(input.baseline ?? {})}`,
			`User Preferences: ${JSON.stringify(input.preferences ?? {})}`,

			"--- KNOWLEDGE BASE (RAG) ---",
			docContext.length > 0
				? JSON.stringify(docContext)
				: "No specific knowledge base entry retrieved.",

			"--- RECENT CONVERSATION ---",
			JSON.stringify(recent),

			"--- OUTPUT SCHEMA (JSON) ---",
			JSON.stringify(
				{
					replyText:
						"The spoken response text (follow voice/language instructions)",
					voiceMode: "comfort|coach|educational|crisis",
					suggestedExercise: "optional_exercise_id",
					tags: ["tag1", "tag2"],
				},
				null,
				2
			),
		].join("\n\n");
	}
}
