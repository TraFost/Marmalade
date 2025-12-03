import { useCallback, useState } from "react";
import { useSwipeable } from "react-swipeable";

const DELTA_THRESHOLD = 50;
const DIRECTION = {
	LEFT: -1,
	RIGHT: 1,
};

export function useSwipeableSteps(
	steps: { illustration: React.ComponentType }[]
) {
	const [currentStep, setCurrentStep] = useState(0);
	const [direction, setDirection] = useState(1);

	const goToStep = useCallback(
		(stepIndex: number) => {
			const isSameStep = stepIndex === currentStep;
			if (isSameStep) return;

			setDirection(stepIndex > currentStep ? DIRECTION.RIGHT : DIRECTION.LEFT);
			setCurrentStep(stepIndex);
		},
		[currentStep]
	);

	const nextStep = useCallback(() => {
		const hasNextStep = currentStep < steps.length - 1;

		if (hasNextStep) {
			goToStep(currentStep + 1);
		}
	}, [currentStep, goToStep]);

	const prevStep = useCallback(() => {
		const hasPrevStep = currentStep > 0;

		if (hasPrevStep) {
			goToStep(currentStep - 1);
		}
	}, [currentStep, goToStep]);

	const handlers = useSwipeable({
		onSwipedLeft: nextStep,
		onSwipedRight: prevStep,
		preventScrollOnSwipe: true,
		trackMouse: false,
		delta: DELTA_THRESHOLD,
	});

	return { currentStep, direction, handlers, goToStep, nextStep, prevStep };
}
