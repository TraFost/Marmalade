import { VertexAI } from "@google-cloud/vertexai";
import { z } from "zod";
import { logger } from "../logger";

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
			model: env.VERTEX_MINI_MODEL,
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
			logger.info(
				{
					candidates: (tokenMeta?.candidates ?? []).length,
					metadata: (tokenMeta as any)?.metadata ?? null,
				},
				"[AI][Counselor] Vertex response (trimmed)"
			);
			const usage = extractTokenUsage(res);
			if (usage) logger.info({ usage }, "[AI][Counselor] token usage");
		} catch (logErr) {
			logger.warn(
				{ err: logErr },
				"[AI][Counselor] Failed to log Vertex response"
			);
		}

		const raw = res.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (_error) {
			logger.error({ raw }, "CounselorBrain JSON Parse Error");
			throw new Error(`CounselorBrain response was not valid JSON`);
		}

		return counselorResponseSchema.parse(parsed);
	}

	async *generateReplyTextStream(input: CounselorBrainInput): AsyncGenerator<
		{
			text: string;
			usage?: {
				inputTokens?: number;
				outputTokens?: number;
				totalTokens?: number;
			};
		},
		void,
		void
	> {
		const model = this.vertex.getGenerativeModel({
			model: env.VERTEX_MINI_MODEL,
			systemInstruction: {
				parts: [{ text: input.systemInstruction }],
				role: "system",
			},
			generationConfig: {
				topP: 0.5,
				temperature: 0.9,
			},
		});

		const prompt = this.buildStreamingPrompt(input);

		const res = await model.generateContentStream({
			contents: [{ role: "user", parts: [{ text: prompt }] }],
		});

		for await (const chunk of res.stream) {
			const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";

			const usageMetadata =
				(chunk as any).usageMetadata || (chunk as any).metadata?.usage;
			const usage = usageMetadata
				? {
						inputTokens:
							usageMetadata.promptTokenCount || usageMetadata.inputTokens,
						outputTokens:
							usageMetadata.candidatesTokenCount || usageMetadata.outputTokens,
						totalTokens:
							usageMetadata.totalTokenCount || usageMetadata.totalTokens,
				  }
				: undefined;

			const finishReason = chunk.candidates?.[0]?.finishReason;
			if (finishReason && finishReason !== "STOP") {
				logger.warn(
					{ finishReason },
					"[AI][Counselor] Stream ended with reason"
				);
			}

			if (text || usage) {
				yield { text, usage };
			}
		}
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
			"Do any deeper state interpretation internally; do NOT output extra analysis objects.",

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

	private buildStreamingPrompt(input: CounselorBrainInput): string {
		const recent = input.conversationWindow.slice(-4);

		const memoryContext = (input.relevantDocs ?? [])
			.map((d) => `[MEMORY]: ${d.content}`)
			.join("\n");

		const nameContext = (input.preferences as any)?.name
			? `Address them as ${(input.preferences as any).name}.`
			: "Stay neutral and professional.";

		return `
        # RECENT HISTORY
        ${recent.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}
        
        # ACTIVE STATE
        Journey: ${input.summary}
        Themes: ${input.themes.join(", ")}
        Safety Mode: ${input.safetyMode}
        ${nameContext}

        # TASK
        ${memoryContext || "No specific memories."}
        
        # LAYER CONSTRAINTS (CRITICAL)
        The first layer has ALREADY reflected the user's immediate feeling.
        - Do NOT just mirror the emotion again (e.g. avoid starting with "This [feeling]...").
        - Instead, EXTEND the thought. Add a new perspective, a grounding metaphor, or a gentle nudge.
        - Your job is to be the bridge, not the echo.

        Continue the conversation based on the System Instructions. 
        Jump straight into the ${
					input.preferences?.responseClass || "reflection"
				}.
        Keep it under 40 words.
        `.trim();
	}
}
