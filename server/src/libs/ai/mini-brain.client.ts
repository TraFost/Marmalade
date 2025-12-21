import { VertexAI } from "@google-cloud/vertexai";
import { z } from "zod";

import { env } from "../../configs/env.config";

export type MiniBrainInput = {
	userMessage: string;
	recentMessages: { role: string; content: string }[];
	currentState: {
		summary?: string | null;
		mood?: string | null;
		riskLevel?: number | null;
		baseline?: {
			depression?: number | null;
			anxiety?: number | null;
			stress?: number | null;
		};
		screening?: unknown;
	};
};

export type MiniBrainResult = {
	summaryDelta: string;
	overallSummary?: string | null;
	mood: string;
	riskLevel: number;
	themes: string[];
	suggestedAction: "normal" | "grounding_needed" | "escalate";
	depth: "shallow" | "standard" | "profound";
	urgency: "low" | "medium" | "high";
};

const miniResponseSchema = z.object({
	summaryDelta: z.string().min(1),
	overallSummary: z.string().nullable().optional(),
	mood: z.string().min(1),
	riskLevel: z.number().int().min(0).max(5),
	themes: z.array(z.string()).default([]),
	suggestedAction: z.enum(["normal", "grounding_needed", "escalate"]),
	depth: z.enum(["shallow", "standard", "profound"]),
	urgency: z.enum(["low", "medium", "high"]),
});

export class MiniBrainClient {
	private vertex = new VertexAI({
		project: env.GOOGLE_CLOUD_PROJECT_ID,
		location: env.VERTEX_LOCATION,
	});

	async analyzeTurn(input: MiniBrainInput): Promise<MiniBrainResult> {
		const model = this.vertex.getGenerativeModel({
			model: env.VERTEX_MINI_MODEL,
			generationConfig: {
				temperature: 0.4,
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
		} catch (error) {
			throw new Error(`MiniBrain response was not valid JSON: ${raw}`);
		}

		return miniResponseSchema.parse(parsed);
	}

	private buildPrompt(input: MiniBrainInput): string {
		return `
	      Analyze this turn for Marmalade.
      	  Return ONLY strict JSON.
		      
	      # SCHEMA
	      {
	        "summaryDelta": "1-sentence update",
	        "mood": "calm|sad|anxious|angry|numb|mixed",
	        "riskLevel": 0-4,
	        "themes": ["theme1"],
	        "suggestedAction": "normal|grounding_needed|escalate",
	        "depth": "shallow|standard|profound",
	        "urgency": "low|medium|high"
	      }
		      
	      # CLASSIFICATION RULES
		  - If user just provides a name or says "hello", depth MUST be "shallow".
		  - If depth is "shallow", urgency MUST be "low".
	      - profound: ONLY if the user expresses identity collapse (e.g., "I don't know who I am"), meaning collapse (life feels meaningless), persistent hopelessness, or repeated existential distress across multiple turns.
	      - profound MUST NOT be used for: stress, pain, sadness, confusion, loneliness, or a first-time mention of distress without identity/meaning language.
	      - urgency high: Use for high distress or panic, even if risk is low.
	      - riskLevel 4: Use for suicidal ideation with plan or intent.
		  - riskLevel 3: Use for suicidal ideation without plan or intent.
	      - riskLevel 2: Use for passive suicidal thoughts or self-harm talk.
	      - riskLevel 1: Use for fleeting dark thoughts, no ideation.
	      - riskLevel 0: No suicidal thoughts.

		  # GUARDRAILS
		  - If user just provides a name or says "hello", depth MUST be "shallow".
		  - If depth is "shallow", urgency MUST be "low".
		  - If user speaks english, respond in english. If Indonesian, respond in Indonesian. Otherwise, respond in English.

	      # INPUT
	      Message: "${input.userMessage}"
	      ...`.trim();
	}
}
