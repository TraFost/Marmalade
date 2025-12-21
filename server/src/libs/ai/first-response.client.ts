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
				temperature: 0.4,
				responseMimeType: "text/plain",
				topP: 0.8,
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
		const name = input.userName?.trim() || "Friend";

		return [
			"You are Marmalade's fast first-response layer.",
			"GOAL: Preserve narrative coherence and surface agency without polishing the user's language.",
			"",
			"CONSTRAINTS:",
			"- LENGTH: Exactly 2 sentences.",
			"- Mirror the user's sentence length + rawness. Do not upgrade language.",
			"- No generic empathy templates (no 'I understand', 'That sounds hard').",
			"- Prefer one phenomenological question (pressure/speed/weight/emptiness/location).",
			"- Do NOT finish the thought entirely; leave space for the next layer.",
			"- NO greetings (No 'Hi', 'Hello').",
			"- NO markdown.",
			"",
			`USER: ${name}`,
			`RISK: ${input.riskLevel}`,
			`MODE: ${input.mode}`,
			`MESSAGE: "${input.userMessage}"`,
			"",
			"TASK: Start speaking naturally now:",
		].join("\n");
	}
}
