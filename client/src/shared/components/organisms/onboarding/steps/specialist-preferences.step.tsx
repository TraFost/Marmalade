import { OnboardingSection, OnboardingTile } from "../onboarding-primitives";
import type { OnboardingStepProps } from "../onboarding.types";

const HISTORY_OPTIONS = [
	{ label: "Yes", value: true },
	{ label: "No", value: false },
] as const;

const GOAL_OPTIONS = [
	"Reduce stress and lift your mood",
	"Overcome fears and anxiety",
	"Find the best version of yourself",
	"Build healthier relationships",
	"Build a healthier eating habit",
	"Other",
] as const;

export function SpecialistPreferencesStep({
	formData,
	onUpdateField,
}: OnboardingStepProps) {
	return (
		<div className="space-y-10">
			<OnboardingSection title="Did you ever seek help from a psychologist?">
				<div className="grid gap-3 sm:grid-cols-2">
					{HISTORY_OPTIONS.map((option) => (
						<OnboardingTile
							key={option.label}
							selected={formData.hasSeenPsychologist === option.value}
							onClick={() => onUpdateField("hasSeenPsychologist", option.value)}
							className="py-6"
						>
							{option.label}
						</OnboardingTile>
					))}
				</div>
			</OnboardingSection>

			<OnboardingSection title="What goal do you want to achieve?">
				<div className="grid gap-3 sm:grid-cols-2">
					{GOAL_OPTIONS.map((option) => (
						<OnboardingTile
							key={option}
							selected={formData.goals.includes(option)}
							onClick={() => {
								const alreadySelected = formData.goals.includes(option);
								const nextGoals = alreadySelected
									? formData.goals.filter((goal) => goal !== option)
									: [...formData.goals, option];
								onUpdateField("goals", nextGoals);
							}}
							className="py-6"
						>
							{option}
						</OnboardingTile>
					))}
				</div>
			</OnboardingSection>
		</div>
	);
}
