import { OnboardingSection, OnboardingTile } from "../onboarding-primitives";
import type { OnboardingStepProps } from "../onboarding.types";
import type {
	ScreeningMedicationStatus,
	ScreeningSleepQuality,
} from "shared/src/types/screening.type";

const SLEEP_OPTIONS: {
	label: string;
	description: string;
	value: ScreeningSleepQuality;
}[] = [
	{ label: "Ideal", description: "7-9 hours", value: "ideal" },
	{ label: "Good", description: "6-7 hours", value: "good" },
	{ label: "Acceptable", description: "5-6 hours", value: "acceptable" },
	{ label: "Not enough", description: "3-6 hours", value: "not_enough" },
	{
		label: "Critically low",
		description: "Less than 3 hours",
		value: "critically_low",
	},
	{
		label: "No sleep mode",
		description: "Fluctuates daily",
		value: "no_sleep_mode",
	},
];

const MEDICATION_OPTIONS: {
	label: string;
	value: ScreeningMedicationStatus;
}[] = [
	{ label: "Yes, regularly", value: "regular" },
	{ label: "Yes, sometimes", value: "sometimes" },
	{ label: "No", value: "none" },
];

export function PhysicalHealthStep({
	formData,
	onUpdateField,
}: OnboardingStepProps) {
	return (
		<div className="space-y-10">
			<OnboardingSection title="How would you describe your sleep quality?">
				<div className="grid gap-3 sm:grid-cols-2">
					{SLEEP_OPTIONS.map((option) => (
						<OnboardingTile
							key={option.label}
							selected={formData.sleepQuality === option.value}
							onClick={() => onUpdateField("sleepQuality", option.value)}
							className="flex flex-col items-start gap-1 text-left py-8 px-4"
						>
							<span className="text-base font-semibold text-foreground">
								{option.label}
							</span>
							<span className="text-xs font-normal text-muted-foreground">
								{option.description}
							</span>
						</OnboardingTile>
					))}
				</div>
			</OnboardingSection>

			<OnboardingSection title="Do you take any medications?">
				<div className="grid gap-3 sm:grid-cols-3">
					{MEDICATION_OPTIONS.map((option) => (
						<OnboardingTile
							key={option.value}
							selected={formData.medicationStatus === option.value}
							onClick={() => onUpdateField("medicationStatus", option.value)}
							className="py-6"
						>
							{option.label}
						</OnboardingTile>
					))}
				</div>
				<textarea
					rows={3}
					placeholder="Share details about your medication routine (optional)"
					className="mt-4 w-full rounded-2xl border border-border bg-secondary/30 px-3 py-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-card"
					value={formData.medicationNotes}
					onChange={(event) =>
						onUpdateField("medicationNotes", event.target.value)
					}
				/>
			</OnboardingSection>
		</div>
	);
}
