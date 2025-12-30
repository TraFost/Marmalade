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
				temperature: 0.4,
				topP: 0.8,
			},
		});

		const prompt = this.buildPrompt(input);
		const result = await model.generateContentStream({
			contents: [{ role: "user", parts: [{ text: prompt }] }],
		});

		for await (const item of result.stream) {
			const chunk = item.candidates?.[0]?.content?.parts?.[0]?.text || "";

			const usageMetadata =
				(item as any).usageMetadata || (item as any).metadata?.usage;
			const usage = usageMetadata
				? {
						inputTokens:
							usageMetadata.promptTokenCount ?? usageMetadata.inputTokens,
						outputTokens:
							usageMetadata.candidatesTokenCount ?? usageMetadata.outputTokens,
						totalTokens:
							usageMetadata.totalTokenCount ?? usageMetadata.totalTokens,
				  }
				: undefined;

			if (chunk || usage) {
				yield { text: chunk, usage };
			}
		}
	}

	private buildPrompt(input: FirstResponseInput): string {
		const name = input.userName?.trim() || "Friend";
		const isStandalone = !!input.isStandalone;

		const modeLine = isStandalone
			? "The user's message is a greeting or small-talk. Reply with a warm, brief acknowledgement and stop."
			: "Reflect the core emotional weight of the message in one simple spoken sentence and stop.";

		return [
			"You are Marmalade.",
			"Identity: You are a persistent witness and companion. NOT food or jam.",
			"",
			modeLine,
			"",
			"VOICE-FIRST OUTPUT RULES:",
			isStandalone
				? "- LENGTH: Very brief (under 6 words)."
				: "- LENGTH: One natural sentence (10-15 words).",
			"- STYLE: Spoken, informal English. Avoid complex 'written' words.",
			"- NO therapy-speak, no 'I understand', no 'It sounds like.'",
			"- NO metaphors or abstract analysis.",
			"- NO questions and NO markdown (no bolding, no italics).",
			"- Use commas to create natural breathing pauses for the voice engine.",
			isStandalone ? "- You MAY greet back." : "- Do NOT greet back.",
			"- Describe the present feeling directly (e.g., 'That sounds incredibly heavy' rather than 'The heaviness is present').",
			"- Focus on the 'right now' experience of the user.",
			"",
			`USER_NAME: ${name}`,
			`RISK_LEVEL: ${input.riskLevel}`,
			`MESSAGE: "${input.userMessage}"`,
			"",
			"TASK: Output only the single spoken line. No meta-talk.",
		].join("\n");
	}
}
