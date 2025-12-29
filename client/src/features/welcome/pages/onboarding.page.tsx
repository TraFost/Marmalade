import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react";

import { Button } from "@/shared/components/atoms/button";
import { Logo } from "@/shared/components/atoms/logo";

import { GeneralDetailsStep } from "@/shared/components/organisms/onboarding/steps/general-details.step";
import { MentalWellbeingStep } from "@/shared/components/organisms/onboarding/steps/mental-wellbeing.step";
import { PhysicalHealthStep } from "@/shared/components/organisms/onboarding/steps/physical-health.step";
import { SelfAnalysisStep } from "@/shared/components/organisms/onboarding/steps/self-analysis.step";
import { SpecialistPreferencesStep } from "@/shared/components/organisms/onboarding/steps/specialist-preferences.step";
import { StepIndicatorList } from "@/shared/components/organisms/onboarding/steps/indicator.step";
import { BackButton } from "@/shared/components/atoms/back-button";
import { useUpsertStateMapping } from "@/features/welcome/hooks/use-mutation.onboarding";
import { useAuth } from "@/shared/hooks/use-auth.hook";
import { useStateMappingGraph } from "@/features/welcome/hooks/use-query.onboarding";

import { computeQuickDassScores } from "@/features/welcome/services/api.onboarding";

import type {
	OnboardingFormData,
	OnboardingStepDefinition,
} from "@/features/welcome/types/onboarding.type";

const GENDERS = ["male", "female", "other"] as const;
const AGE_RANGES = [
	"16-20",
	"20-30",
	"30-40",
	"40-50",
	"50-60",
	"60+",
] as const;
const SLEEP_QUALITIES = [
	"ideal",
	"good",
	"acceptable",
	"not_enough",
	"critically_low",
	"no_sleep_mode",
] as const;
const MEDICATION_STATUSES = ["regular", "sometimes", "none"] as const;
const WILL_STATUSES = ["stable", "strained", "collapsed", "unclear"] as const;
const INTERACTION_PREFERENCES = ["direct", "soft", "analytical"] as const;

const PSYCHOLOGIST_YES_ANCHOR = "Has seen a psychologist before";
const PSYCHOLOGIST_NO_ANCHOR = "Has not seen a psychologist before";

const isOneOf = <T extends readonly string[]>(
	values: T,
	value: unknown
): value is T[number] =>
	typeof value === "string" && (values as readonly string[]).includes(value);

const getResumeStepIndex = (data: OnboardingFormData) => {
	const firstIncomplete = STEP_DEFINITIONS.findIndex(
		(step) => !step.validate(data)
	);
	if (firstIncomplete === -1) return TOTAL_STEPS - 1;
	return Math.min(Math.max(firstIncomplete, 0), TOTAL_STEPS - 1);
};

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
			data.hasSeenPsychologist !== null &&
			data.goals.length > 0 &&
			data.willStatus !== null &&
			data.interactionPreference !== null &&
			data.lifeAnchors.length > 0 &&
			data.painQualia.trim().length > 0,
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
	willStatus: null,
	lifeAnchors: [],
	unfinishedLoops: "",
	painQualia: "",
	interactionPreference: null,
	hasSeenPsychologist: null,
	goals: [],
};

const TOTAL_STEPS = STEP_DEFINITIONS.length;

import { useNavigate } from "react-router";
import { useStartSession } from "@/features/session/hooks/use-mutation.session";

export function OnboardingPage() {
	useAuth();
	const navigate = useNavigate();
	const graphQuery = useStateMappingGraph();
	const [currentStep, setCurrentStep] = useState(0);
	const [formData, setFormData] =
		useState<OnboardingFormData>(INITIAL_FORM_DATA);
	const [isStartingSession, setIsStartingSession] = useState(false);
	const hasHydratedRef = useRef(false);

	const stepConfig = STEP_DEFINITIONS[currentStep];
	const StepComponent = stepConfig.component;
	const canProceed = stepConfig.validate(formData);
	const isLastStep = currentStep === TOTAL_STEPS - 1;

	const upsertMutation = useUpsertStateMapping();
	const startSessionMutation = useStartSession();

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

	useEffect(() => {
		if (hasHydratedRef.current) return;
		const signals = graphQuery.data?.signals;
		const anchors = graphQuery.data?.graph?.anchors;
		if (!signals && !anchors) return;

		hasHydratedRef.current = true;
		setFormData((previous) => {
			const isPristine =
				previous.gender === null &&
				previous.ageRange === null &&
				previous.sleepQuality === null &&
				previous.medicationStatus === null &&
				previous.happinessScore === null &&
				previous.positiveSources.length === 0 &&
				Object.values(previous.dassScores).every((v) => v === null) &&
				previous.willStatus === null &&
				previous.lifeAnchors.length === 0 &&
				previous.unfinishedLoops.trim().length === 0 &&
				previous.painQualia.trim().length === 0 &&
				previous.interactionPreference === null &&
				previous.hasSeenPsychologist === null &&
				previous.goals.length === 0 &&
				(previous.medicationNotes ?? "") === "";

			if (!isPristine) return previous;

			const anchorValues = Array.isArray(anchors?.values)
				? anchors.values
				: null;
			const nextPositiveSources = Array.isArray(anchorValues)
				? anchorValues.filter(
						(v) => v !== PSYCHOLOGIST_YES_ANCHOR && v !== PSYCHOLOGIST_NO_ANCHOR
				  )
				: previous.positiveSources;

			const hasSeenPsychologistFromAnchors = Array.isArray(anchorValues)
				? anchorValues.includes(PSYCHOLOGIST_YES_ANCHOR)
					? true
					: anchorValues.includes(PSYCHOLOGIST_NO_ANCHOR)
					? false
					: previous.hasSeenPsychologist
				: previous.hasSeenPsychologist;

			const nextGender = isOneOf(GENDERS, signals?.profile?.gender)
				? signals?.profile?.gender
				: previous.gender;
			const nextAgeRange = isOneOf(AGE_RANGES, signals?.profile?.ageRange)
				? signals?.profile?.ageRange
				: previous.ageRange;
			const nextSleepQuality = isOneOf(SLEEP_QUALITIES, signals?.sleepQuality)
				? signals?.sleepQuality
				: previous.sleepQuality;
			const nextMedicationStatus = isOneOf(
				MEDICATION_STATUSES,
				signals?.medicationStatus
			)
				? signals?.medicationStatus
				: previous.medicationStatus;

			const nextWillStatus = isOneOf(WILL_STATUSES, signals?.willStatus)
				? signals?.willStatus
				: previous.willStatus;
			const nextInteractionPreference = isOneOf(
				INTERACTION_PREFERENCES,
				signals?.interactionPreference
			)
				? signals?.interactionPreference
				: previous.interactionPreference;

			const hydrated: OnboardingFormData = {
				...previous,
				gender: nextGender,
				ageRange: nextAgeRange,
				sleepQuality: nextSleepQuality,
				medicationStatus: nextMedicationStatus,
				medicationNotes:
					typeof signals?.medicationNotes === "string"
						? signals.medicationNotes
						: previous.medicationNotes,
				happinessScore: signals?.happinessScore ?? previous.happinessScore,
				positiveSources: nextPositiveSources,
				goals: Array.isArray(anchors?.goals) ? anchors.goals : previous.goals,
				lifeAnchors: Array.isArray(anchors?.lifeAnchors)
					? anchors.lifeAnchors
					: previous.lifeAnchors,
				willStatus: nextWillStatus,
				interactionPreference: nextInteractionPreference,
				painQualia:
					typeof signals?.painQualia === "string"
						? signals.painQualia
						: previous.painQualia,
				unfinishedLoops:
					typeof signals?.unfinishedLoops === "string"
						? signals.unfinishedLoops
						: previous.unfinishedLoops,
				hasSeenPsychologist: hasSeenPsychologistFromAnchors,
			};

			setCurrentStep(getResumeStepIndex(hydrated));
			return hydrated;
		});
	}, [graphQuery.data]);

	const goToStep = (nextIndex: number) => {
		setCurrentStep(() => Math.min(Math.max(nextIndex, 0), TOTAL_STEPS - 1));
	};

	const persistStep = async () => {
		switch (currentStep + 1) {
			case 1:
				await upsertMutation.mutateAsync({
					signals: {
						profile: {
							gender: formData.gender,
							ageRange: formData.ageRange,
						},
					},
				});
				return;
			case 2:
				await upsertMutation.mutateAsync({
					signals: {
						sleepQuality: formData.sleepQuality,
						medicationStatus: formData.medicationStatus,
						medicationNotes: formData.medicationNotes,
					},
				});
				return;
			case 3:
				await upsertMutation.mutateAsync({
					signals: { happinessScore: formData.happinessScore },
					anchors: { values: formData.positiveSources },
				});
				return;
			case 4: {
				const scores = computeQuickDassScores({
					flatJoy: formData.dassScores.flatJoy!,
					motivation: formData.dassScores.motivation!,
					physicalAnxiety: formData.dassScores.physicalAnxiety!,
					worry: formData.dassScores.worry!,
					restDifficulty: formData.dassScores.restDifficulty!,
					irritability: formData.dassScores.irritability!,
				});
				await upsertMutation.mutateAsync({
					signals: { dass: scores },
				});
				return;
			}
			case 5:
				await upsertMutation.mutateAsync({
					signals: {
						willStatus: formData.willStatus,
						unfinishedLoops: formData.unfinishedLoops,
						painQualia: formData.painQualia,
						interactionPreference: formData.interactionPreference,
					},
					anchors: {
						goals: formData.goals,
						lifeAnchors: formData.lifeAnchors,
						values: [
							formData.hasSeenPsychologist
								? PSYCHOLOGIST_YES_ANCHOR
								: PSYCHOLOGIST_NO_ANCHOR,
						],
					},
				});
				return;
			default:
				return;
		}
	};

	const handleNext = async () => {
		if (!canProceed) return;

		await persistStep();

		if (isLastStep) {
			setIsStartingSession(true);
			try {
				let existingSessionId: string | null = null;
				try {
					existingSessionId = localStorage.getItem("marmalade:sessionId");
				} catch {
					// ignore
				}

				if (existingSessionId) {
					navigate(`/session/${existingSessionId}`);
					return;
				}

				const sessionId = await startSessionMutation.mutateAsync();
				if (sessionId) {
					navigate(`/session/${sessionId}`);
					return;
				}
			} catch (error) {
				console.error("Failed to start session", error);
			} finally {
				setIsStartingSession(false);
			}
		}

		setCurrentStep((previous) => Math.min(previous + 1, TOTAL_STEPS - 1));
	};

	const handleBack = () => {
		setCurrentStep((previous) => Math.max(previous - 1, 0));
	};

	return (
		<section className="bg-background min-h-dvh">
			<div className="flex size-full flex-col overflow-hidden bg-card lg:flex-row">
				<aside className="w-full border-b border-border/60 bg-secondary/40 p-6 lg:w-[320px] lg:border-b-0 lg:border-r lg:p-10">
					<div className="flex items-center gap-3 text-primary">
						<Logo className="size-16" />
						<div>
							<p className="text-lg font-semibold text-foreground">Marmalade</p>
							<p className="text-xs text-muted-foreground">Here for you</p>
						</div>

						<div className="ml-auto lg:hidden">
							<BackButton onHandleBack={handleBack} />
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

				<div className="flex-1 bg-white p-6 sm:py-2 sm:px-10 lg:p-16">
					<header className="lg:items-center lg:justify-between hidden lg:flex">
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
							<div className="hidden sm:block">
								{currentStep > 0 ? (
									<BackButton onHandleBack={handleBack} />
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
									disabled={!canProceed || isStartingSession}
								>
									{isLastStep
										? isStartingSession
											? "Starting..."
											: "Finish"
										: "Next"}
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
