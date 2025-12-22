import { OnboardingSection, OnboardingTile } from "../onboarding-primitives";
import type { OnboardingStepProps } from "../onboarding.types";

const QUESTION_CONFIG = [
	{
		prompt: "How often did you feel flat or unable to feel joy this past week?",
		key: "flatJoy",
	},
	{
		prompt: "How often did you struggle to start tasks, even small ones?",
		key: "motivation",
	},
	{
		prompt:
			"How often did you feel physical tension such as a fast heartbeat or shallow breath?",
		key: "physicalAnxiety",
	},
	{
		prompt: "How often did your mind jump to worst-case scenarios?",
		key: "worry",
	},
	{
		prompt: "How often did you find it hard to relax or unwind?",
		key: "restDifficulty",
	},
	{
		prompt:
			"How often did you feel irritated or mentally overloaded by small things?",
		key: "irritability",
	},
] as const satisfies ReadonlyArray<{
	prompt: string;
	key: Parameters<OnboardingStepProps["onUpdateDassScore"]>[0];
}>;

const DASS_OPTIONS = [
	{ label: "Never", value: 0 },
	{ label: "Sometimes", value: 1 },
	{ label: "Often", value: 2 },
	{ label: "Almost always", value: 3 },
] as const;

export function SelfAnalysisStep({
	formData,
	onUpdateDassScore,
}: OnboardingStepProps) {
	return (
		<div className="space-y-8 overflow-y-auto max-h-[70vh] pr-5 pb-3">
			<div className="space-y-3">
				<h2 className="text-2xl font-semibold text-foreground">
					Let us quickly scan how this past week felt.
				</h2>
				<p className="text-sm text-muted-foreground">
					Answer six short questions so we can estimate your mood, anxiety, and
					stress levels.
				</p>
			</div>

			{QUESTION_CONFIG.map(({ prompt, key }, index) => {
				const selectedOption = formData.dassScores[key];

				return (
					<OnboardingSection key={key} title={`${index + 1}. ${prompt}`}>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
							{DASS_OPTIONS.map((option) => (
								<OnboardingTile
									key={option.value}
									selected={selectedOption === option.value}
									onClick={() => onUpdateDassScore(key, option.value)}
									className="py-6 text-sm"
								>
									{option.label}
								</OnboardingTile>
							))}
						</div>
					</OnboardingSection>
				);
			})}
		</div>
	);
}
