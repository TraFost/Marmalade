export type VoiceSession = {
	id: string;
	userId: string;
	startedAt: Date;
	endedAt: Date | null;
	maxRiskLevel: number;
	messageCount: number;
	durationSeconds: number | null;
	audioUrl: string | null;
	summaryDocId: string | null;
};

export type StartSessionResponse = {
	id: string;
	userId: string;
	startedAt: Date;
};

export type EndSessionResponse = {
	summaryDocId: string;
	summary: string;
};
