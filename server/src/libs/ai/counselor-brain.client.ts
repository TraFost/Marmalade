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
			generationConfig: {
				temperature: 0.6,
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
		} catch (_error) {
			throw new Error(`CounselorBrain response was not valid JSON: ${raw}`);
		}

		return counselorResponseSchema.parse(parsed);
	}

	private buildPrompt(input: CounselorBrainInput): string {
		const recent = input.conversationWindow.slice(-12);
		const docContext = (input.relevantDocs ?? []).map((d) => ({
			source: d.source,
			content: d.content?.slice(0, 800),
			type: d.type,
		}));

		return [
			"You are a supportive mental health copilot. Keep responses brief (<=120 words) and actionable.",
			"Use safetyMode to adjust tone: normal, caution, high_caution, crisis.",
			"If safetyMode is crisis, be direct, keep user safe, and use crisis voiceMode.",
			"Respond with ONLY JSON matching this shape:",
			JSON.stringify(
				{
					replyText: "reply string",
					voiceMode: "comfort|coach|educational|crisis",
					suggestedExercise: "optional exercise",
					tags: ["tag1", "tag2"],
				},
				null,
				2
			),
			"Context:",
			`Summary: ${input.summary ?? ""}`,
			`Mood: ${input.mood ?? "unknown"}`,
			`Risk level: ${input.riskLevel}`,
			`Safety mode: ${input.safetyMode}`,
			`Themes: ${JSON.stringify(input.themes)}`,
			`Baseline: ${JSON.stringify(input.baseline ?? {})}`,
			`Preferences: ${JSON.stringify(input.preferences ?? {})}`,
			`Relevant docs: ${JSON.stringify(docContext)}`,
			`Recent conversation (most recent last): ${JSON.stringify(recent)}`,
		].join("\n");
	}
}
