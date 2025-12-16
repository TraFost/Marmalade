import type { ComponentType, ReactNode } from "react";

import type {
	QuickDassInput,
	ScreeningAgeRange,
	ScreeningGender,
	ScreeningMedicationStatus,
	ScreeningSleepQuality,
} from "shared";

export type OnboardingDassScores = {
	[K in keyof QuickDassInput]: number | null;
};

export type OnboardingFormData = {
	gender: ScreeningGender | null;
	ageRange: ScreeningAgeRange | null;
	sleepQuality: ScreeningSleepQuality | null;
	medicationStatus: ScreeningMedicationStatus | null;
	medicationNotes: string;
	happinessScore: number | null;
	positiveSources: string[];
	dassScores: OnboardingDassScores;
	hasSeenPsychologist: boolean | null;
	goals: string[];
};

export type OnboardingStepProps = {
	formData: OnboardingFormData;
	onUpdateField: <K extends keyof OnboardingFormData>(
		key: K,
		value: OnboardingFormData[K]
	) => void;
	onTogglePositiveSource: (source: string) => void;
	onUpdateDassScore: (
		questionKey: keyof OnboardingDassScores,
		value: number
	) => void;
};

export type OnboardingStepDefinition = {
	id: number;
	title: string;
	subTitle: string;
	component: ComponentType<OnboardingStepProps>;
	validate: (data: OnboardingFormData) => boolean;
};

export type OnboardingDetailItem = {
	label: string;
	description?: string;
	value?: ReactNode;
};
