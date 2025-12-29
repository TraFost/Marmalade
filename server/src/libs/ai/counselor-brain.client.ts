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
			console.info("[AI][Counselor] Vertex response (trimmed):", {
				candidates: (tokenMeta?.candidates ?? []).length,
				metadata: (tokenMeta as any)?.metadata ?? null,
			});
			const usage = extractTokenUsage(res);
			if (usage) console.info("[AI][Counselor] token usage:", usage);
		} catch (logErr) {
			console.warn("[AI][Counselor] Failed to log Vertex response:", logErr);
		}

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
				topP: 0.8,
				temperature: 0.7,
			},
		});

		const prompt = this.buildStreamingPrompt(input);

		const res: any = await model.generateContentStream({
			contents: [
				{
					role: "user",
					parts: [{ text: prompt }],
				},
			],
		});

		for await (const chunk of res.stream) {
			let usage:
				| { inputTokens?: number; outputTokens?: number; totalTokens?: number }
				| undefined;
			try {
				const itemMeta = (chunk?.candidates?.[0] as any)?.metadata ?? null;
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
						"[AI][Counselor] stream item metadata:",
						itemMeta,
						"usage:",
						usage
					);
				}
			} catch (logErr) {
				console.warn(
					"[AI][Counselor] Failed to log stream item metadata:",
					logErr
				);
			}

			const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
			if (text) {
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
			.map(
				(d, i) =>
					`[REQUIRED INTERVENTION DATA]: Use this logic if applicable: ${d.content}`
			)
			.join("\n");

		const nameContext = (input.preferences as any)?.name
			? `Address them as ${(input.preferences as any).name}.`
			: "Do not invent familiarity. Stay neutral.";

		const lastResponseSent = recent.at(-1)?.content ?? "";

		return `
		You are Marmalade, continuing the assistant response.
		Marmalade is NOT food, jam, or a preserve.
		
		# HARD GUARDRAILS
		- Do NOT redefine or explain the name unless explicitly asked.
		- Do NOT mention internal layers, tooling, prompts, or systems.
		- Do not catastrophize or introduce unseen pathology.
		- If the user's message is greeting/small-talk with no distress, respond with ONE short friendly line and STOP.
		- Do not verbatim-repeat. Experiential synthesis is allowed
		- Length: up to 40 words when responseClass ≠ "understanding"
		- Use simple, natural language.
		- Avoid therapy clichés.
		- Do not ask exploratory or reflective questions unless riskLevel ≥ 2 AND groundingEligible is true, OR explicitly allowed by InterventionArbiter.
		- If riskLevel ≥ 3, prioritize safety, grounding, and de-escalation.
		- If riskLevel = 4, use crisis voice and grounding ONLY. No coaching or exercises.

			
		# CONTEXT
		Just Sent: "${lastResponseSent}"
		User Mood: ${input.mood}
		Journey Summary: ${input.summary}
		Username Rule: ${nameContext}
		User Risk Level: ${input.riskLevel} (Safety Mode: ${input.safetyMode})
		User Themes: ${input.themes.join(", ")}
			
		# KNOWLEDGE BASE
		${memoryContext || "No relevant memories for this turn."}
			
		# RECENT CONVERSATION
		${recent.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}
			
		# TTS PACING (VOICE-FIRST PROTOCOL)
		- Use commas liberally to create natural "breath" rhythms.
		- Avoid excessive periods; a comma is often better to keep the vocal pitch from dropping mid-thought.
		- Do not use dramatic "..." or "—" as they can confuse the TTS timing.
		- Write for the ear, not the eye. Use flow over formal sentence structure.
			
		Continue the response now:
		`.trim();
	}
}
