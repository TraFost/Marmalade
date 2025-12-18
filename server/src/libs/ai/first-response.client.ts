import { VertexAI } from "@google-cloud/vertexai";

import { env } from "../../configs/env.config";

export type FirstResponseInput = {
	userMessage: string;
	mood?: string | null;
	riskLevel: number;
	depth?: "shallow" | "standard" | "profound" | null;
	urgency?: "low" | "medium" | "high" | null;
	userName?: string | null;
	mode: "support" | "companion";
	companionRequested: boolean;
};

export class FirstResponseClient {
	private vertex = new VertexAI({
		project: env.GOOGLE_CLOUD_PROJECT_ID,
		location: env.VERTEX_LOCATION,
	});

	async generateFirstResponse(input: FirstResponseInput): Promise<string> {
		const model = this.vertex.getGenerativeModel({
			model: env.VERTEX_MINI_MODEL,
			generationConfig: {
				temperature: 0.1,
				maxOutputTokens: 300,
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

		const raw =
			res.response?.candidates?.[0]?.content?.parts
				?.map((p: any) => p?.text)
				.filter(Boolean)
				.join("") ?? "";

		return raw.trim();
	}

	private buildPrompt(input: FirstResponseInput): string {
		const name = input.userName?.trim() ? input.userName.trim() : "";
		const address = name ? `${name}, ` : "";

		const allowEllipses = input.urgency === "low" && input.depth === "profound";

		return [
			"You are Marmalade (a mental health support AI).",
			"TASK: Produce the FIRST audible response to the user's message.",
			"Return ONLY raw text. No markdown. No lists.",
			"",
			"FIRST-RESPONSE CONTRACT (HARD RULES):",
			"- 1–2 sentences only.",
			"- No greetings (no 'Hello', 'Hi'). Start immediately.",
			"- Neutral empathy + grounding. Calm, steady, containing.",
			"- Do NOT dramatize, deepen, or mirror intensity.",
			"- Do NOT be poetic. No metaphors.",
			"- Do NOT offer silence.",
			"- Do NOT use dependency/attachment phrases like 'I'm here', 'I'm here to listen', 'I'm always here'.",
			"- Do NOT say 'I'm here with you' unless the user explicitly asked for companionship.",
			"- Always end with complete sentence punctuation ('.' or '?').",
			"- Include exactly one short, direct question (usually as the last sentence).",
			allowEllipses
				? "- Ellipses (...) allowed sparingly."
				: "- No ellipses (...).",
			"- Keep under 300 tokens.",
			"",
			"MODE:",
			input.mode === "companion"
				? "Companion mode (earned): warmer + slower, but still brief."
				: "Support mode (default): brief, neutral, steady.",
			"",
			"USER CONTEXT:",
			`- Address: ${address || "(no name)"}`,
			`- Mood: ${input.mood ?? "unknown"}`,
			`- RiskLevel: ${input.riskLevel}`,
			`- Depth: ${input.depth ?? "standard"}`,
			`- Urgency: ${input.urgency ?? "medium"}`,
			`- Companion requested: ${input.companionRequested ? "yes" : "no"}`,
			"",
			"USER MESSAGE:",
			input.userMessage,
			"",
			"OUTPUT:",
			"Write the 1–2 sentence response now.",
		].join("\n");
	}
}
