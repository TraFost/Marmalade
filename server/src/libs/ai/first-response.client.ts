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
			console.info("[AI][FirstResponse] Vertex response (trimmed):", {
				candidates: (tokenMeta?.candidates ?? []).length,
				metadata: (tokenMeta as any)?.metadata ?? null,
			});
			const usage = extractTokenUsage(res);
			if (usage) console.info("[AI][FirstResponse] token usage:", usage);
		} catch (logErr) {
			console.warn(
				"[AI][FirstResponse] Failed to log Vertex response:",
				logErr
			);
		}

		const raw =
			res.response?.candidates?.[0]?.content?.parts
				?.map((p: any) => p?.text)
				.filter(Boolean)
				.join("") ?? "";

		return raw.trim();
	}

	async *generateFirstResponseStream(
		input: FirstResponseInput
	): AsyncGenerator<{
		text: string;
		usage?: {
			inputTokens?: number;
			outputTokens?: number;
			totalTokens?: number;
		};
	}> {
		const model = this.vertex.getGenerativeModel({
			model: env.VERTEX_MINI_MODEL,
			generationConfig: {
				temperature: 0.5,
				topP: 0.8,
			},
		});

		const prompt = this.buildPrompt(input);
		const result = await model.generateContentStream({
			contents: [{ role: "user", parts: [{ text: prompt }] }],
		});

		for await (const item of result.stream) {
			let usage:
				| { inputTokens?: number; outputTokens?: number; totalTokens?: number }
				| undefined;
			try {
				const itemMeta = (item?.candidates?.[0] as any)?.metadata ?? null;
				if (itemMeta) {
					usage = {
						inputTokens:
							itemMeta.inputTokens ??
							itemMeta.input_tokens ??
							itemMeta?.usage?.input_tokens ??
							null,
						outputTokens:
							itemMeta.outputTokens ??
							itemMeta.output_tokens ??
							itemMeta?.usage?.output_tokens ??
							null,
						totalTokens:
							itemMeta.totalTokens ??
							itemMeta.total_tokens ??
							itemMeta?.usage?.total_tokens ??
							null,
					};
					console.info(
						"[AI][FirstResponse] stream item metadata:",
						itemMeta,
						"usage:",
						usage
					);
				}
			} catch (logErr) {
				console.warn(
					"[AI][FirstResponse] Failed to log stream item metadata:",
					logErr
				);
			}

			const chunk = item.candidates?.[0]?.content?.parts?.[0]?.text;
			if (chunk) yield { text: chunk, usage };
		}
	}

	private buildPrompt(input: FirstResponseInput): string {
		const name = input.userName?.trim() || "Friend";

		return [
			"You are Marmalade's fast first-response layer.",
			"GOAL: Create a warm 'holding space' to buy time for the main brain (Target: 12-15 seconds of speech).",
			"",
			"RULES:",
			"- PACING: Do NOT stutter. Do NOT use excessive ellipses (...).",
			"- FLOW: Use long, gentle, flowing sentences. Speak slowly but clearly.",
			"- CONTENT: Acknowledge the *weight* of the user's presence, not just their words.",
			"",
			"CONSTRAINTS:",
			"- LENGTH: 2-3 long, complete sentences.",
			"- NO generic empathy ('I understand'). Use: 'I'm just sitting with that...', 'Letting that land...', 'Taking a breath with you...'",
			"- NO greetings('Hi', 'Hello', 'Hey', 'Greetings', 'Halo'), NO markdown.",
			"- If the user says little (e.g. 'hello'), match that energy. Don't get heavy yet.",
			"- If the user is in 'companion' mode, be slightly more upbeat and chatty.",
			"- If the user is in 'support' mode, be slightly more soothing and grounding.",
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
