import { OnboardingSection, OnboardingTile } from "../onboarding-primitives";
import type { OnboardingStepProps } from "../onboarding.types";
import type { InteractionPreference, WillStatus } from "../onboarding.types";

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

const WILL_STATUS_OPTIONS: {
	label: string;
	description: string;
	value: WillStatus;
}[] = [
	{
		label: "Stable",
		description: "You can still choose and act",
		value: "stable",
	},
	{
		label: "Strained",
		description: "You can act, but it costs a lot",
		value: "strained",
	},
	{
		label: "Collapsed",
		description: "Doing anything feels nearly impossible",
		value: "collapsed",
	},
	{
		label: "Unclear",
		description: "It changes day to day",
		value: "unclear",
	},
];

const INTERACTION_PREFERENCES: {
	label: string;
	description: string;
	value: InteractionPreference;
}[] = [
	{
		label: "Direct",
		description: "Clear, practical, no fluff",
		value: "direct",
	},
	{
		label: "Soft",
		description: "Gentle, validating, slow pace",
		value: "soft",
	},
	{
		label: "Analytical",
		description: "Patterns, frameworks, cause/effect",
		value: "analytical",
	},
];

const parseList = (raw: string): string[] =>
	raw
		.split(/\n|,/g)
		.map((s) => s.trim())
		.filter(Boolean)
		.slice(0, 10);

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

			<OnboardingSection
				title="What are your life anchors?"
				description="A few people, values, places, or commitments that keep you here. One per line (up to 10)."
			>
				<textarea
					rows={4}
					placeholder="Example: My little sister\nFinishing my degree\nBeing honest with myself"
					className="w-full rounded-2xl border border-border bg-secondary/30 px-3 py-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-card"
					value={formData.lifeAnchors.join("\n")}
					onChange={(event) =>
						onUpdateField("lifeAnchors", parseList(event.target.value))
					}
				/>
			</OnboardingSection>

			<OnboardingSection
				title="When things get hard, how is your willpower right now?"
				description="This helps Marmalade pace suggestions and set the right expectations."
			>
				<div className="grid gap-3 sm:grid-cols-2">
					{WILL_STATUS_OPTIONS.map((option) => (
						<OnboardingTile
							key={option.value}
							selected={formData.willStatus === option.value}
							onClick={() => onUpdateField("willStatus", option.value)}
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

			<OnboardingSection
				title="How should Marmalade talk to you?"
				description="Pick the tone that feels most helpful."
			>
				<div className="grid gap-3 sm:grid-cols-3">
					{INTERACTION_PREFERENCES.map((option) => (
						<OnboardingTile
							key={option.value}
							selected={formData.interactionPreference === option.value}
							onClick={() =>
								onUpdateField("interactionPreference", option.value)
							}
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

			<OnboardingSection
				title="If your distress had a texture, what is it?"
				description="One or two words is enough (e.g., heavy, sharp, numb, noise)."
			>
				<input
					type="text"
					placeholder="Example: heavy"
					className="w-full rounded-2xl border border-border bg-secondary/30 px-3 py-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-card"
					value={formData.painQualia}
					onChange={(event) => onUpdateField("painQualia", event.target.value)}
				/>
			</OnboardingSection>

			<OnboardingSection
				title="Any unfinished loops?"
				description="Optional: anything unresolved that keeps pulling your mind back."
			>
				<textarea
					rows={4}
					placeholder="Example: A conversation I keep replaying"
					className="w-full rounded-2xl border border-border bg-secondary/30 px-3 py-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-card"
					value={formData.unfinishedLoops}
					onChange={(event) =>
						onUpdateField("unfinishedLoops", event.target.value)
					}
				/>
			</OnboardingSection>
		</div>
	);
}
