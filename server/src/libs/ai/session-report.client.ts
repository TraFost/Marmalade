import { VertexAI } from "@google-cloud/vertexai";
import { z, ZodError } from "zod";

import { env } from "../../configs/env.config";
import { AppError } from "../helper/error.helper";
import type { ConversationReport } from "shared";

export type SessionReportInput = {
	systemInstruction: string;
	conversationWindow: {
		role: "user" | "assistant";
		content: string;
		createdAt?: string;
	}[];
	sessionId: string;
	userId: string;
	objectiveContext: {
		messageCount: number;
		dateRange: { start: string; end: string } | null;
		maxRiskLevelObserved: number;
	};
	stateContext?: {
		summary?: string | null;
		mood?: string | null;
		riskLevel?: number | null;
		themes?: string[] | null;
		preferences?: Record<string, unknown> | null;
	};
};

const reportSchema: z.ZodType<ConversationReport> = z
	.object({
		version: z.literal(1),
		generatedAt: z.string().min(1),
		reportTitle: z.string().min(1),
		disclaimer: z.string().min(1),
		dataCoverage: z.object({
			turnsIncluded: z.number().int().min(0),
			truncated: z.boolean(),
		}),
		soapNote: z
			.object({
				subjective: z.object({
					summary: z.string().min(1),
					reportedFeelings: z.array(z.string()).default([]),
					reportedStressors: z.array(z.string()).default([]),
					userQuotes: z.array(z.string()).default([]),
				}),
				objective: z.object({
					interactionSummary: z.string().min(1),
					messageCount: z.number().int().min(0),
					dateRange: z
						.object({ start: z.string().min(1), end: z.string().min(1) })
						.nullable(),
					observations: z.array(z.string()).default([]),
				}),
				assessment: z.object({
					summaryOfThemesNoDiagnosis: z.string().min(1),
					narrativeThemes: z
						.array(
							z.object({
								theme: z.string().min(1),
								evidence: z.array(z.string()).default([]),
							})
						)
						.default([]),
					affectiveObservations: z.object({
						overallTone: z.string().min(1),
						notableAffects: z
							.array(
								z.object({
									affect: z.string().min(1),
									approximateShare: z.string().min(1),
									evidence: z.array(z.string()).default([]),
								})
							)
							.default([]),
					}),
				}),
				plan: z.object({
					userStatedNextSteps: z.array(z.string()).default([]),
					suggestedTherapyQuestions: z.array(z.string()).default([]),
					safetyNote: z.string().min(1),
				}),
			})
			.optional(),
		personalReflection: z.object({
			summary: z.string().min(1),
			whatFeltHard: z.array(z.string()).default([]),
			whatHelped: z.array(z.string()).default([]),
			whatINeedFromTherapy: z.array(z.string()).default([]),
		}),
		clinicalMemo: z.object({
			narrativeThemes: z
				.array(
					z.object({
						theme: z.string().min(1),
						evidence: z.array(z.string()).default([]),
					})
				)
				.default([]),
			affectiveObservations: z.object({
				overallTone: z.string().min(1),
				notableAffects: z
					.array(
						z.object({
							affect: z.string().min(1),
							approximateShare: z.string().min(1),
							evidence: z.array(z.string()).default([]),
						})
					)
					.default([]),
			}),
			continuitySignals: z
				.array(
					z.object({
						label: z.string().min(1),
						description: z.string().min(1),
						evidence: z.array(z.string()).default([]),
					})
				)
				.default([]),
			riskSummary: z.object({
				maxRiskLevelObserved: z.number().int().min(0).max(4),
				notes: z.string().min(1),
			}),
			suggestedTherapyQuestions: z.array(z.string()).default([]),
		}),
	})
	.strict();

const REPORT_OUTPUT_SCHEMA = `{
  "version": 1,
  "generatedAt": "ISO timestamp",
  "reportTitle": "string",
  "disclaimer": "string",
  "dataCoverage": { "turnsIncluded": 0, "truncated": false },
  "soapNote": {
    "subjective": {
      "summary": "string",
      "reportedFeelings": ["string"],
      "reportedStressors": ["string"],
      "userQuotes": ["short quote"]
    },
    "objective": {
      "interactionSummary": "string",
      "messageCount": 0,
      "dateRange": { "start": "ISO", "end": "ISO" },
      "observations": ["string"]
    },
    "assessment": {
      "summaryOfThemesNoDiagnosis": "string",
      "narrativeThemes": [{ "theme": "string", "evidence": ["string"] }],
      "affectiveObservations": {
        "overallTone": "string",
        "notableAffects": [{ "affect": "string", "approximateShare": "~30%", "evidence": ["string"] }]
      }
    },
    "plan": {
      "userStatedNextSteps": ["string"],
      "suggestedTherapyQuestions": ["string"],
      "safetyNote": "string"
    }
  },
  "personalReflection": {
    "summary": "string",
    "whatFeltHard": ["string"],
    "whatHelped": ["string"],
    "whatINeedFromTherapy": ["string"]
  },
  "clinicalMemo": {
    "narrativeThemes": [{ "theme": "string", "evidence": ["string"] }],
    "affectiveObservations": {
      "overallTone": "string",
      "notableAffects": [{ "affect": "string", "approximateShare": "~30%", "evidence": ["string"] }]
    },
    "continuitySignals": [{ "label": "string", "description": "string", "evidence": ["string"] }],
    "riskSummary": { "maxRiskLevelObserved": 0, "notes": "string" },
    "suggestedTherapyQuestions": ["string"]
  }
}`;

export class SessionReportClient {
	private vertex = new VertexAI({
		project: env.GOOGLE_CLOUD_PROJECT_ID,
		location: env.VERTEX_LOCATION,
	});

	async generateReport(input: SessionReportInput): Promise<ConversationReport> {
		const model = this.vertex.getGenerativeModel({
			model: env.VERTEX_COUNSELOR_MODEL,
			systemInstruction: {
				role: "system",
				parts: [{ text: input.systemInstruction }],
			},
			generationConfig: {
				temperature: 0.4,
				responseMimeType: "application/json",
			},
		});

		const prompt = this.buildPrompt(input);

		const res = await model.generateContent({
			contents: [{ role: "user", parts: [{ text: prompt }] }],
		});

		const raw = res.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (err) {
			console.warn("[AI][Report] Failed to parse JSON:", {
				err: (err as Error).message,
				raw,
			});
			throw new AppError(
				"Report response was not valid JSON",
				400,
				"INVALID_REPORT_RESPONSE_JSON"
			);
		}

		try {
			return reportSchema.parse(parsed);
		} catch (err) {
			if (err instanceof ZodError) {
				console.warn("[AI][Report] Report response failed validation:", {
					issues: err.issues,
					raw,
				});
				throw new AppError(
					"Report response failed validation",
					400,
					"INVALID_REPORT_RESPONSE_SCHEMA"
				);
			}
			throw err;
		}
	}

	private buildPrompt(input: SessionReportInput): string {
		return [
			"You generate an AI-generated therapy preparation report.",
			"Use SOAP note structure for the report (Subjective, Objective, Assessment, Plan).",
			"NEVER provide a medical diagnosis. NEVER label disorders. Use neutral observational language.",
			"Non-diagnostic, reflective summary, not medical advice.",
			"NEVER include safety instructions beyond a brief non-alarming note; do not give crisis hotlines.",
			"Return ONLY strict JSON matching the schema below. No extra keys.",
			REPORT_OUTPUT_SCHEMA,
			"",
			"# CONTEXT",
			`sessionId: ${JSON.stringify(input.sessionId)}`,
			`userId: ${JSON.stringify(input.userId)}`,
			`objectiveContext: ${JSON.stringify(input.objectiveContext)}`,
			`stateContext: ${JSON.stringify(input.stateContext ?? {})}`,
			"",
			"# CONVERSATION (oldest -> newest)",
			JSON.stringify(input.conversationWindow),
		]
			.join("\n\n")
			.trim();
	}
}
