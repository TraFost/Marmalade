import type { ComponentType, ReactNode } from "react";
import { InteractionPreference, WillStatus } from "shared";

export type Gender = "male" | "female" | "other";
export type AgeRange = "16-20" | "20-30" | "30-40" | "40-50" | "50-60" | "60+";

export type SleepQuality =
	| "ideal"
	| "good"
	| "acceptable"
	| "not_enough"
	| "critically_low"
	| "no_sleep_mode";

export type MedicationStatus = "regular" | "sometimes" | "none";

export type OnboardingDassKey =
	| "flatJoy"
	| "motivation"
	| "physicalAnxiety"
	| "worry"
	| "restDifficulty"
	| "irritability";

export type OnboardingDassScores = Record<OnboardingDassKey, number | null>;

export type OnboardingFormData = {
	gender: Gender | null;
	ageRange: AgeRange | null;
	sleepQuality: SleepQuality | null;
	medicationStatus: MedicationStatus | null;
	medicationNotes: string;
	happinessScore: number | null;
	positiveSources: string[];
	dassScores: OnboardingDassScores;
	willStatus: WillStatus | null;
	lifeAnchors: string[];
	unfinishedLoops: string;
	painQualia: string;
	interactionPreference: InteractionPreference | null;
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
	onUpdateDassScore: (questionKey: OnboardingDassKey, value: number) => void;
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
