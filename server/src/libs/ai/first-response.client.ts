import { VertexAI } from "@google-cloud/vertexai";

import { env } from "../../configs/env.config";
import { BASE_PERSONA } from "./prompts/shared.prompt";

export type FirstResponseInput = {
	userMessage: string;
	mood?: string | null;
	riskLevel: number;
	depth?: "shallow" | "standard" | "profound" | null;
	urgency?: "low" | "medium" | "high" | null;
	userName?: string | null;
	mode: "support" | "companion";
	companionRequested: boolean;
	isStandalone?: boolean;
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
		const isStandalone = !!input.isStandalone;

		if (isStandalone) {
			return [
				BASE_PERSONA,
				"You are Marmalade's fast first-response layer.",
				"GOAL: Produce a warm, witty, self-contained reply that directly answers the user's greeting or short message.",
				"",
				"RULES:",
				"- No poetic stalling. No 'sitting with the depth' or 'letting it land'.",
				"- Do not identify as a 'layer' or 'first response'.",
				"- Just be a human friend who is listening.",
				"- CONTENT: Acknowledge the user's last point briefly and naturally.",
				"",
				"CONSTRAINTS:",
				"- LENGTH: 1-2 polished, complete sentences.",
				"- NO trailing ellipses.",
				"- NO markdown or greetings that are just 'Hi' without additional content.",
				"- CALIBRATION CHECK: If the user is complaining (e.g. 'you are slow', 'stop') or asking a functional question ('what time is it'), DO NOT use deep/heavy language. Instead say: 'I hear that, and I'm thinking carefully to give you the best answer...'",
				"",
				`USER: ${name}`,
				`RISK: ${input.riskLevel}`,
				`MODE: ${input.mode}`,
				`MESSAGE: "${input.userMessage}"`,
				"",
				"TASK: Produce a warm, complete reply now.",
			].join("\n");
		}

		return [
			"You are Marmalade's fast first-response layer.",
			"GOAL: Create a warm 'holding space' to buy time for the main brain (Target: 12-15 seconds of speech).",
			"",
			"RULES:",
			"- PACING: Do NOT stutter. Use gentle, flowing sentences.",
			"- FLOW: Do NOT finish the thought completely; leave room for follow-up (it's okay to end with '...').",
			"- CONTENT: Acknowledge the *weight* of the user's presence, not just their words.",
			"",
			"CONSTRAINTS:",
			"- LENGTH: 2-3 long, incomplete sentences that stall a little.",
			"- Use a trailing ellipsis where appropriate to indicate continuation.",
			"- NO generic empathy ('I understand'). Use: 'I'm just sitting with that...', 'Letting that land...', 'Taking a breath with you...'",
			"",
			`USER: ${name}`,
			`RISK: ${input.riskLevel}`,
			`MODE: ${input.mode}`,
			`MESSAGE: "${input.userMessage}"`,
			"",
			"TASK: Start speaking now and leave space for the main brain to continue...",
		].join("\n");
	}
}
