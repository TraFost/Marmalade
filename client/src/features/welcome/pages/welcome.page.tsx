import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";

import { MeetMarmaladeIllustration } from "@/shared/components/organisms/welcome/meet.welcome";
import { CheckInIllustration } from "@/shared/components/organisms/welcome/check-in.welcome";
import { TimelineIllustration } from "@/shared/components/organisms/welcome/timeline.welcome";
import { VoiceIllustration } from "@/shared/components/organisms/welcome/voice.welcome";

import { Button, buttonVariants } from "@/shared/components/atoms/button";

import { useSwipeableSteps } from "@/shared/hooks/use-swipe.hook";
import { useHotkey } from "@/shared/hooks/use-hotkey.hook";

import { cn } from "@/shared/lib/helper/classname";
import { slideVariants } from "@/shared/lib/animations/slide.animation";
import { PRIVATE_PAGES } from "@/app/router/private.route";

type WelcomeStep = {
	id: number;
	title: string;
	body: string;
	buttonText: string;
	illustration: React.ComponentType;
};

const WELCOME_STEPS = [
	{
		id: 1,
		title: "Meet Marmalade.",
		body: "A companion that remembers your story and checks in on how you're really doing.",
		buttonText: "Next",
		illustration: MeetMarmaladeIllustration,
	},
	{
		id: 2,
		title: "Start with a quick check-in.",
		body: "Answer a short set of questions about stress, anxiety, and mood to set your baseline.",
		buttonText: "Next",
		illustration: CheckInIllustration,
	},
	{
		id: 3,
		title: "Marmalade remembers for you.",
		body: "It keeps track of your patterns, rough days, and small wins so you can see real progress over time.",
		buttonText: "Next",
		illustration: TimelineIllustration,
	},
	{
		id: 4,
		title: "Talk in a voice that feels safe.",
		body: "Use calm or custom voices so your check-ins feel more human, less robotic.",
		buttonText: "Begin your first check-in",
		illustration: VoiceIllustration,
	},
] satisfies ReadonlyArray<WelcomeStep>;

const LAST_STEP_INDEX = WELCOME_STEPS.length - 1;
const SECTION_TRANSITION = { duration: 0.35, ease: "easeInOut" } as const;
const CTA_INTERACTION = {
	hover: { scale: 1.01 },
	tap: { scale: 0.97 },
} as const;
const PROGRESS_WIDTH = { active: 32, inactive: 8 } as const;

export function WelcomePage() {
	const navigate = useNavigate();

	const { currentStep, direction, handlers, goToStep, nextStep, prevStep } =
		useSwipeableSteps(WELCOME_STEPS);

	const step = WELCOME_STEPS[currentStep];
	const isLastStep = currentStep === LAST_STEP_INDEX;

	const onNext = () => {
		if (isLastStep) navigate(PRIVATE_PAGES[1].path);

		nextStep();
	};

	useHotkey("ArrowRight", nextStep);
	useHotkey("ArrowLeft", prevStep);

	return (
		<motion.section
			{...handlers}
			className="min-h-dvh bg-background"
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={SECTION_TRANSITION}
		>
			<div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-between px-6 py-8 md:py-12">
				<IllustrationStage currentStep={currentStep} direction={direction} />
				<WelcomeFooter
					currentStep={currentStep}
					goToStep={goToStep}
					nextStep={onNext}
					step={step}
					isLastStep={isLastStep}
					direction={direction}
				/>
			</div>
		</motion.section>
	);
}

type StageProps = {
	currentStep: number;
	direction: number;
};

function IllustrationStage({ currentStep, direction }: StageProps) {
	const Illustration = WELCOME_STEPS[currentStep].illustration;

	return (
		<div className="flex w-full flex-1 items-center justify-center overflow-hidden py-8">
			<AnimatePresence mode="wait" custom={direction}>
				<motion.div
					key={currentStep}
					custom={direction}
					variants={slideVariants}
					initial="enter"
					animate="center"
					exit="exit"
					transition={SECTION_TRANSITION}
					className="w-full"
				>
					<Illustration />
				</motion.div>
			</AnimatePresence>
		</div>
	);
}

type FooterProps = {
	currentStep: number;
	direction: number;
	goToStep: (index: number) => void;
	nextStep: () => void;
	step: WelcomeStep;
	isLastStep: boolean;
};

function WelcomeFooter({
	currentStep,
	direction,
	goToStep,
	nextStep,
	step,
	isLastStep,
}: FooterProps) {
	return (
		<footer className="w-full space-y-6">
			<AnimatePresence mode="wait" custom={direction}>
				<motion.div
					key={currentStep}
					custom={direction}
					variants={slideVariants}
					initial="enter"
					animate="center"
					exit="exit"
					transition={SECTION_TRANSITION}
					className="space-y-3 text-center"
				>
					<h1 className="text-balance text-[22px] font-semibold leading-tight text-foreground md:text-[26px]">
						{step.title}
					</h1>
					<p className="mx-auto max-w-xs text-pretty text-[14px] leading-relaxed text-muted-foreground md:text-[16px]">
						{step.body}
					</p>
				</motion.div>
			</AnimatePresence>

			<ProgressDots currentStep={currentStep} goToStep={goToStep} />

			<div className="space-y-3">
				<motion.div
					whileHover={CTA_INTERACTION.hover}
					whileTap={CTA_INTERACTION.tap}
					transition={{ duration: 0.15 }}
				>
					<button
						onClick={nextStep}
						className={cn(
							buttonVariants({ variant: "primary", size: "lg" }),
							"w-full rounded-xl py-4 text-base font-semibold shadow-md"
						)}
					>
						{step.buttonText}
					</button>
				</motion.div>

				{!isLastStep && (
					<Button
						onClick={() => goToStep(LAST_STEP_INDEX)}
						variant="ghost"
						size="lg"
						className="w-full rounded-xl border border-transparent text-base font-medium text-muted-foreground transition-colors hover:border-border hover:bg-transparent hover:text-foreground"
					>
						Skip intro
					</Button>
				)}
			</div>
		</footer>
	);
}

type ProgressDotsProps = {
	currentStep: number;
	goToStep: (index: number) => void;
};

function ProgressDots({ currentStep, goToStep }: ProgressDotsProps) {
	return (
		<div
			className="flex justify-center gap-2"
			role="tablist"
			aria-label="Onboarding progress"
		>
			{WELCOME_STEPS.map((step, index) => (
				<Button
					key={step.id}
					onClick={() => goToStep(index)}
					role="tab"
					aria-selected={index === currentStep}
					aria-label={`Go to step ${index + 1}`}
					variant="ghost"
					size="sm"
					className={cn(
						"h-2 rounded-full px-0 transition-[width,background-color] duration-300 ease-out",
						index === currentStep
							? "bg-primary"
							: "bg-black/50 hover:bg-primary/50"
					)}
					style={{
						width:
							index === currentStep
								? PROGRESS_WIDTH.active
								: PROGRESS_WIDTH.inactive,
					}}
				/>
			))}
		</div>
	);
}
