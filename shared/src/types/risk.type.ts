export type RiskLog = {
	id: string;
	userId: string;
	sessionId: string;
	riskLevel: number;
	mood: string | null;
	themes: string[] | null;
	createdAt?: Date;
};
