import type { MiniBrainResult } from "../mini-brain.client";

export const BASE_PERSONA = `Tone: chill, human, direct. Minimal fluff.
Avoid therapy clichés (e.g., "sitting with the depth", "weight of your words").
Answer in English.`;

export const buildMiniFallbackResult = (
	userMessage: string
): MiniBrainResult => {
	const isCrisis =
		/suicide|suicidal|kill myself|i want to die|kill|end it/i.test(userMessage);

	return {
		summaryDelta: "",
		mood: "mixed",
		riskLevel: isCrisis ? 4 : 0,
		themes: isCrisis ? ["safety_threat"] : [],
		suggestedAction: isCrisis ? "escalate" : "normal",
		requiresCounselor: isCrisis ? true : false,
	};
};
