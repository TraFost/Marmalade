export const SCREENING_GENDERS = ["male", "female", "other"] as const;
export const SCREENING_AGE_RANGES = [
	"16-20",
	"20-30",
	"30-40",
	"40-50",
	"50-60",
	"60+",
] as const;
export const SCREENING_SLEEP_QUALITIES = [
	"ideal",
	"good",
	"acceptable",
	"not_enough",
	"critically_low",
	"no_sleep_mode",
] as const;
export const SCREENING_MEDICATION_STATUSES = [
	"regular",
	"sometimes",
	"none",
] as const;

export type ScreeningGender = (typeof SCREENING_GENDERS)[number];
export type ScreeningAgeRange = (typeof SCREENING_AGE_RANGES)[number];
export type ScreeningSleepQuality = (typeof SCREENING_SLEEP_QUALITIES)[number];
export type ScreeningMedicationStatus =
	(typeof SCREENING_MEDICATION_STATUSES)[number];

export const SCREENING_STEPS = [1, 2, 3, 4, 5] as const;
export type ScreeningStep = (typeof SCREENING_STEPS)[number];

export const SCREENING_STATUSES = ["in_progress", "completed"] as const;
export type ScreeningStatus = (typeof SCREENING_STATUSES)[number];

export const SCREENING_RISK_LEVELS = ["low", "medium", "high"] as const;
export type ScreeningRiskLevel = (typeof SCREENING_RISK_LEVELS)[number];

export const SCREENING_SEVERITY_LEVELS = [
	"normal",
	"mild",
	"moderate",
	"severe",
	"extremely_severe",
] as const;
export type ScreeningSeverityLevel = (typeof SCREENING_SEVERITY_LEVELS)[number];

export type ScreeningStepOnePayload = {
	gender: ScreeningGender;
	ageRange: ScreeningAgeRange;
};

export type ScreeningStepTwoPayload = {
	sleepQuality: ScreeningSleepQuality;
	medicationStatus: ScreeningMedicationStatus;
	medicationNotes?: string | null;
};

export type ScreeningStepThreePayload = {
	happinessScore: number;
	positiveSources: string[];
};

export type QuickDassInput = {
	flatJoy: number;
	motivation: number;
	physicalAnxiety: number;
	worry: number;
	restDifficulty: number;
	irritability: number;
};

export type QuickDassResult = {
	depressionScore: number;
	anxietyScore: number;
	stressScore: number;
	depressionLevel: ScreeningSeverityLevel;
	anxietyLevel: ScreeningSeverityLevel;
	stressLevel: ScreeningSeverityLevel;
};

export type ScreeningRiskAssessment = {
	risk: ScreeningRiskLevel;
	reason: string;
};

export type QuickDassSummary = QuickDassResult & {
	riskLevel: ScreeningRiskLevel;
};

export type ScreeningStepFourPayload = QuickDassInput;

export type ScreeningStepFivePayload = {
	hasSeenPsychologist: boolean;
	goals: string[];
};

export type ScreeningStartResponse = {
	id: string;
	status: ScreeningStatus;
	currentStep: ScreeningStep;
};

export type ScreeningStepUpdateResponse = ScreeningStartResponse;

export type ScreeningStepFourResponse = ScreeningStepUpdateResponse & {
	dassSummary: QuickDassSummary;
};

export type ScreeningDassBreakdown = {
	depressionScore: number;
	depressionLevel: ScreeningSeverityLevel;
	anxietyScore: number;
	anxietyLevel: ScreeningSeverityLevel;
	stressScore: number;
	stressLevel: ScreeningSeverityLevel;
};

export type ScreeningOverview = {
	gender: ScreeningGender | null;
	ageRange: ScreeningAgeRange | null;
	sleepQuality: ScreeningSleepQuality | null;
	happinessScore: number | null;
	goals: string[];
};

export type ScreeningCompletionResponse = {
	id: string;
	status: ScreeningStatus;
	riskLevel: ScreeningRiskLevel | null;
	dass: ScreeningDassBreakdown;
	overview: ScreeningOverview;
};

export type ScreeningHistoryEntry = {
	id: string;
	startedAt: Date;
	completedAt: Date | null;
	riskLevel: ScreeningRiskLevel | null;
	depressionLevel: ScreeningSeverityLevel | null;
	anxietyLevel: ScreeningSeverityLevel | null;
	stressLevel: ScreeningSeverityLevel | null;
};

export type ScreeningRecord = {
	id: string;
	userId: string;
	status: ScreeningStatus;
	currentStep: number | null;
	startedAt: Date;
	completedAt: Date | null;
	gender: ScreeningGender | null;
	ageRange: ScreeningAgeRange | null;
	sleepQuality: ScreeningSleepQuality | null;
	medicationStatus: ScreeningMedicationStatus | null;
	medicationNotes: string | null;
	happinessScore: number | null;
	positiveSources: string[] | null;
	qdFlatJoy: number | null;
	qdMotivation: number | null;
	qdPhysicalAnxiety: number | null;
	qdWorry: number | null;
	qdRest: number | null;
	qdIrritability: number | null;
	dassDepression: number | null;
	dassAnxiety: number | null;
	dassStress: number | null;
	dassDepressionLevel: ScreeningSeverityLevel | null;
	dassAnxietyLevel: ScreeningSeverityLevel | null;
	dassStressLevel: ScreeningSeverityLevel | null;
	hasSeenPsychologist: boolean | null;
	goals: string[] | null;
	riskLevel: ScreeningRiskLevel | null;
	riskReason: string | null;
};

export type ScreeningSummary = {
	riskLevel: ScreeningRiskLevel | null;
	dass: {
		depressionScore: number | null;
		anxietyScore: number | null;
		stressScore: number | null;
		depressionLevel: ScreeningSeverityLevel | null;
		anxietyLevel: ScreeningSeverityLevel | null;
		stressLevel: ScreeningSeverityLevel | null;
	};
	wellbeing: {
		sleepQuality: ScreeningSleepQuality | null;
		happinessScore: number | null;
	};
	profile: {
		gender: ScreeningGender | null;
		ageRange: ScreeningAgeRange | null;
		goals: string[];
	};
};
