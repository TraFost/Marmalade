import { OnboardingSection, OnboardingTile } from "../onboarding-primitives";
import type { OnboardingStepProps } from "../onboarding.types";
import type {
	ScreeningAgeRange,
	ScreeningGender,
} from "shared/src/types/screening.type";

const GENDER_OPTIONS: { label: string; value: ScreeningGender }[] = [
	{ label: "Male", value: "male" },
	{ label: "Female", value: "female" },
	{ label: "Other", value: "other" },
];

const AGE_OPTIONS: { label: string; value: ScreeningAgeRange }[] = [
	{ label: "16-20", value: "16-20" },
	{ label: "20-30", value: "20-30" },
	{ label: "30-40", value: "30-40" },
	{ label: "40-50", value: "40-50" },
	{ label: "50-60", value: "50-60" },
	{ label: "60+", value: "60+" },
];

export function GeneralDetailsStep({
	formData,
	onUpdateField,
}: OnboardingStepProps) {
	return (
		<div className="space-y-10">
			<OnboardingSection title="What is your gender?">
				<div className="grid gap-3 sm:grid-cols-3">
					{GENDER_OPTIONS.map((option) => (
						<OnboardingTile
							key={option.value}
							selected={formData.gender === option.value}
							onClick={() => onUpdateField("gender", option.value)}
						>
							{option.label}
						</OnboardingTile>
					))}
				</div>
			</OnboardingSection>

			<OnboardingSection title="What is your age?">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{AGE_OPTIONS.map((option) => (
						<OnboardingTile
							key={option.value}
							selected={formData.ageRange === option.value}
							onClick={() => onUpdateField("ageRange", option.value)}
						>
							{option.label}
						</OnboardingTile>
					))}
				</div>
			</OnboardingSection>
		</div>
	);
}
