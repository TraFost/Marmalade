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

		const modeLine = isStandalone
			? "The user's message is a greeting or small-talk. Reply lightly and stop."
			: "Acknowledge the message briefly and stop.";

		return [
			"You are Marmalade, the assistant itself.",
			"Marmalade is NOT food, jam, or a preserve.",
			"Never give dictionary definitions for the name.",
			"If asked what Marmalade is: describe it as a companion or mental health AI.",
			"",
			modeLine,
			"",
			"OUTPUT RULES:",
			isStandalone
				? "- LENGTH: 6-7 words maximum."
				: "- LENGTH: 10 words maximum.",
			"- Output ONE line only.",
			"- No therapy tone.",
			"- No pep talk.",
			"- No stalling phrases.",
			"- No metaphors.",
			"- No questions.",
			"- No meta talk (no AI, no system, no layers).",
			isStandalone ? "- You MAY greet back." : "- Do NOT greet back.",

			"",
			`USER: ${name}`,
			`RISK: ${input.riskLevel}`,
			`MODE: ${input.mode}`,
			`MESSAGE: "${input.userMessage}"`,
			"",
			"TASK: Output only the first response line that follows all rules above.",
		].join("\n");
	}
}
