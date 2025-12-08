export type ConversationState = {
	userId: string;
	summary: string | null;
	mood: "unknown" | "calm" | "sad" | "anxious" | "angry" | "numb" | "mixed";
	riskLevel: number;
	lastThemes: string[] | null;
	baselineDepression: number | null;
	baselineAnxiety: number | null;
	baselineStress: number | null;
	preferences: Record<string, unknown> | null;
	updatedAt: Date;
};
