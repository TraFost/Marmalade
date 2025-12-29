export type ConversationReport = {
	version: 1;
	generatedAt: string;
	reportTitle: string;
	generalSummary: string;
	disclaimer: string;
	dataCoverage: {
		turnsIncluded: number;
		truncated: boolean;
	};
	soapNote?: {
		subjective: {
			summary: string;
			reportedFeelings: string[];
			reportedStressors: string[];
			userQuotes: string[];
		};
		objective: {
			interactionSummary: string;
			messageCount: number;
			dateRange: { start: string; end: string } | null;
			observations: string[];
		};
		assessment: {
			summaryOfThemesNoDiagnosis: string;
			narrativeThemes: { theme: string; evidence: string[] }[];
			affectiveObservations: {
				overallTone: string;
				notableAffects: {
					affect: string;
					approximateShare: string;
					evidence: string[];
				}[];
			};
		};
		plan: {
			userStatedNextSteps: string[];
			suggestedTherapyQuestions: string[];
			safetyNote: string;
		};
	};
	personalReflection: {
		summary: string;
		whatFeltHard: string[];
		whatHelped: string[];
		whatINeedFromTherapy: string[];
	};
	clinicalMemo: {
		narrativeThemes: { theme: string; evidence: string[] }[];
		affectiveObservations: {
			overallTone: string;
			notableAffects: {
				affect: string;
				approximateShare: string; // e.g. "~30% of turns" (heuristic)
				evidence: string[];
			}[];
		};
		continuitySignals: {
			label: string;
			description: string;
			evidence: string[];
		}[];
		riskSummary: {
			maxRiskLevelObserved: number; // 0-4
			notes: string;
		};
		suggestedTherapyQuestions: string[];
	};
};

export type GenerateSessionReportRequest = {
	sessionId: string;
	messageLimit?: number;
};

export type GenerateSessionReportResponse = {
	sessionId: string;
	report: ConversationReport;
	meta: {
		messageCountUsed: number;
		truncated: boolean;
	};
};
