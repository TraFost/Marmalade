import {
	OnboardingScaleButton,
	OnboardingSection,
	OnboardingTile,
} from "../onboarding-primitives";
import type { OnboardingStepProps } from "../onboarding.types";

const HAPPINESS_SCALE = Array.from({ length: 10 }, (_, index) => index + 1);
const HAPPINESS_SOURCES = [
	"Family",
	"Friends",
	"Nature",
	"Sport",
	"Hobby",
	"Pets",
	"Dreaming",
	"Food",
	"Other",
] as const;

export function MentalWellbeingStep({
	formData,
	onTogglePositiveSource,
	onUpdateField,
}: OnboardingStepProps) {
	return (
		<div className="space-y-10">
			<OnboardingSection title="On a scale of 1 to 10, how happy are you now?">
				<div className="flex gap-2 overflow-x-auto pb-2">
					{HAPPINESS_SCALE.map((value) => (
						<OnboardingScaleButton
							key={value}
							value={value}
							isActive={formData.happinessScore === value}
							onSelect={(score) => onUpdateField("happinessScore", score)}
						/>
					))}
				</div>
			</OnboardingSection>

			<OnboardingSection title="What makes you happy?">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{HAPPINESS_SOURCES.map((source) => (
						<OnboardingTile
							key={source}
							selected={formData.positiveSources.includes(source)}
							onClick={() => onTogglePositiveSource(source)}
							className="py-6"
						>
							{source}
						</OnboardingTile>
					))}
				</div>
			</OnboardingSection>
		</div>
	);
}
