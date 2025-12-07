import { useMemo, useState } from "react";
import { ArrowRightIcon, CaretLeftIcon } from "@phosphor-icons/react";

import { Button } from "@/shared/components/atoms/button";
import { Logo } from "@/shared/components/atoms/logo";

import { GeneralDetailsStep } from "@/shared/components/organisms/onboarding/steps/general-details.step";
import { MentalWellbeingStep } from "@/shared/components/organisms/onboarding/steps/mental-wellbeing.step";
import { PhysicalHealthStep } from "@/shared/components/organisms/onboarding/steps/physical-health.step";
import { SelfAnalysisStep } from "@/shared/components/organisms/onboarding/steps/self-analysis.step";
import { SpecialistPreferencesStep } from "@/shared/components/organisms/onboarding/steps/specialist-preferences.step";
import { StepIndicatorList } from "@/shared/components/organisms/onboarding/steps/indicator.step";

import type {
	OnboardingFormData,
	OnboardingStepDefinition,
} from "@/features/welcome/types/onboarding.type";

const STEP_DEFINITIONS: OnboardingStepDefinition[] = [
	{
		id: 1,
		title: "General details",
		subTitle: "Basic info about you",
		component: GeneralDetailsStep,
		validate: (data) => Boolean(data.gender && data.ageRange),
	},
	{
		id: 2,
		title: "Physical health status",
		subTitle: "Sleep and medication",
		component: PhysicalHealthStep,
		validate: (data) => Boolean(data.sleepQuality && data.medicationStatus),
	},
	{
		id: 3,
		title: "Mental well-being",
		subTitle: "Happiness and inspiration",
		component: MentalWellbeingStep,
		validate: (data) =>
			Boolean(data.happinessScore && data.positiveSources.length),
	},
	{
		id: 4,
		title: "Self-analysis",
		subTitle: "Quick emotional scan",
		component: SelfAnalysisStep,
		validate: (data) =>
			Object.values(data.dassScores).every((value) => value !== null),
	},
	{
		id: 5,
		title: "Specialist preferences",
		subTitle: "Goals and history",
		component: SpecialistPreferencesStep,
		validate: (data) =>
			data.hasSeenPsychologist !== null && data.goals.length > 0,
	},
];

const INITIAL_FORM_DATA: OnboardingFormData = {
	gender: null,
	ageRange: null,
	sleepQuality: null,
	medicationStatus: null,
	medicationNotes: "",
	happinessScore: null,
	positiveSources: [],
	dassScores: {
		flatJoy: null,
		motivation: null,
		physicalAnxiety: null,
		worry: null,
		restDifficulty: null,
		irritability: null,
	},
	hasSeenPsychologist: null,
	goals: [],
};

const TOTAL_STEPS = STEP_DEFINITIONS.length;

export function OnboardingPage() {
	const [currentStep, setCurrentStep] = useState(0);
	const [formData, setFormData] =
		useState<OnboardingFormData>(INITIAL_FORM_DATA);
	const [formFilled, setFormFilled] = useState(false);

	const stepConfig = STEP_DEFINITIONS[currentStep];
	const StepComponent = stepConfig.component;
	const canProceed = stepConfig.validate(formData);
	const isLastStep = currentStep === TOTAL_STEPS - 1;

	const progressPercent = useMemo(
		() => ((currentStep + 1) / TOTAL_STEPS) * 100,
		[currentStep]
	);

	const onUpdateField = <K extends keyof OnboardingFormData>(
		key: K,
		value: OnboardingFormData[K]
	) => {
		setFormData((previous) => ({ ...previous, [key]: value }));
	};

	const onTogglePositiveSource = (source: string) => {
		setFormData((previous) => {
			const alreadySelected = previous.positiveSources.includes(source);
			return {
				...previous,
				positiveSources: alreadySelected
					? previous.positiveSources.filter((item) => item !== source)
					: [...previous.positiveSources, source],
			};
		});
	};

	const onUpdateDassScore = (
		questionKey: keyof OnboardingFormData["dassScores"],
		value: number
	) => {
		setFormData((previous) => ({
			...previous,
			dassScores: { ...previous.dassScores, [questionKey]: value },
		}));
	};

	const goToStep = (nextIndex: number) => {
		setCurrentStep(() => Math.min(Math.max(nextIndex, 0), TOTAL_STEPS - 1));
		setFormFilled(false);
	};

	const handleNext = () => {
		if (!canProceed) return;

		if (isLastStep) {
			setFormFilled(true);
			console.info("Marmalade onboarding complete", formData);
			return;
		}

		setCurrentStep((previous) => Math.min(previous + 1, TOTAL_STEPS - 1));
	};

	const handleBack = () => {
		setFormFilled(false);
		setCurrentStep((previous) => Math.max(previous - 1, 0));
	};

	return (
		<section className="bg-background h-dvh">
			<div className="flex size-full flex-col overflow-hidden bg-card lg:flex-row">
				<aside className="w-full border-b border-border/60 bg-secondary/40 p-6 lg:w-[320px] lg:border-b-0 lg:border-r lg:p-10">
					<div className="flex items-center gap-3 text-primary">
						<Logo className="size-16" />
						<div>
							<p className="text-lg font-semibold text-foreground">Marmalade</p>
							<p className="text-xs text-muted-foreground">Here for you</p>
						</div>
					</div>

					<div className="mt-10 space-y-3">
						<h1 className="text-2xl font-semibold text-foreground">
							Take care of your mental health
						</h1>
						<p className="text-sm leading-relaxed text-muted-foreground">
							Follow five simple steps so we can personalize your experience
							with Marmalade
						</p>
					</div>

					<div className="mt-10 hidden lg:block">
						<StepIndicatorList
							steps={STEP_DEFINITIONS}
							currentStep={currentStep}
							goToStep={goToStep}
						/>
					</div>

					<div className="mt-6 rounded-2xl border border-border/60 bg-card p-4 text-sm text-muted-foreground lg:hidden">
						<div className="flex items-center justify-between">
							<span>
								Step {currentStep + 1} of {TOTAL_STEPS}
							</span>
							<div className="h-1.5 w-24 overflow-hidden rounded-full bg-border">
								<div
									className="h-full bg-primary transition-all"
									style={{ width: `${progressPercent}%` }}
								/>
							</div>
						</div>
					</div>
				</aside>

				<div className="flex-1 bg-white p-6 sm:p-10 lg:p-16">
					<header className="flex items-center justify-between">
						<div className="hidden text-sm font-medium uppercase tracking-wide text-muted-foreground sm:block">
							Step {currentStep + 1}/{TOTAL_STEPS}
						</div>
						<div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-secondary/60 text-base font-semibold text-primary">
							{String(currentStep + 1).padStart(2, "0")}
						</div>
					</header>

					<div className="mt-8 flex flex-col gap-8">
						<StepComponent
							formData={formData}
							onUpdateField={onUpdateField}
							onTogglePositiveSource={onTogglePositiveSource}
							onUpdateDassScore={onUpdateDassScore}
						/>
					</div>

					<footer className="mt-10 border-t border-border/50 pt-6">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								{currentStep > 0 ? (
									<button
										type="button"
										onClick={handleBack}
										className="inline-flex items-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
									>
										<CaretLeftIcon size={16} weight="bold" className="mr-1" />
										Back
									</button>
								) : (
									<span className="text-sm text-muted-foreground">
										Let us get to know you
									</span>
								)}
							</div>

							<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
								<Button
									variant="primary"
									size="lg"
									className="w-full px-8 py-4 text-base font-semibold sm:w-auto"
									onClick={handleNext}
									disabled={!canProceed}
								>
									{isLastStep ? "Finish" : "Next"}
									{!isLastStep ? (
										<ArrowRightIcon size={18} weight="bold" className="ml-2" />
									) : null}
								</Button>
							</div>
						</div>
					</footer>
				</div>
			</div>
		</section>
	);
}
