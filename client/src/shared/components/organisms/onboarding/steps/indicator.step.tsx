import { CheckIcon } from "@phosphor-icons/react";

import { cn } from "@/shared/lib/helper/classname";

import type { OnboardingStepDefinition } from "@/features/welcome/types/onboarding.type";

type StepIndicatorListProps = {
	steps: OnboardingStepDefinition[];
	currentStep: number;
	goToStep: (index: number) => void;
};

export function StepIndicatorList({
	steps,
	currentStep,
	goToStep,
}: StepIndicatorListProps) {
	return (
		<ol>
			{steps.map((step, index) => {
				const isActive = index === currentStep;
				const isCompleted = index < currentStep;

				return (
					<li key={step.id} className="flex items-start gap-4">
						<div className="relative flex flex-col items-center">
							<button
								type="button"
								onClick={() => goToStep(index)}
								className={cn(
									"flex size-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
									isCompleted
										? "border-primary bg-primary text-white"
										: isActive
										? "border-primary bg-card text-primary"
										: "border-border bg-card text-muted-foreground"
								)}
								aria-label={`Go to step ${index + 1}`}
							>
								{isCompleted ? <CheckIcon className="size-4" /> : index + 1}
							</button>
							{index < steps.length - 1 ? (
								<span className="block h-12 w-px bg-border" />
							) : null}
						</div>
						<div>
							<p
								className={cn(
									"text-base font-semibold",
									isActive ? "text-primary" : "text-foreground"
								)}
							>
								{step.title}
							</p>
							<p className="text-sm text-muted-foreground">{step.subTitle}</p>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
