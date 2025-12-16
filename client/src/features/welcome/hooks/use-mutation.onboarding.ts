import { useMutation } from "@tanstack/react-query";

import {
	completeStepFive,
	startScreening,
	updateStepFour,
	updateStepOne,
	updateStepThree,
	updateStepTwo,
} from "@/features/welcome/services/api.onboarding";
import { centralScreeningInvalidation } from "@/features/welcome/services/invalidations.onboarding";
import type {
	ScreeningStepFivePayload,
	ScreeningStepFourPayload,
	ScreeningStepOnePayload,
	ScreeningStepThreePayload,
	ScreeningStepTwoPayload,
} from "shared";

export function useStartScreening(userId?: string) {
	return useMutation({
		mutationFn: () => startScreening(),
		onSettled: (data) =>
			centralScreeningInvalidation({
				type: "start",
				screeningId: data?.id,
				userId,
			}),
	});
}

export function useUpdateScreeningStepOne(params: {
	screeningId: string;
	userId?: string;
}) {
	return useMutation({
		mutationFn: (payload: ScreeningStepOnePayload) =>
			updateStepOne(params.screeningId, payload),
		onSettled: () =>
			centralScreeningInvalidation({
				type: "step",
				screeningId: params.screeningId,
				userId: params.userId,
			}),
	});
}

export function useUpdateScreeningStepTwo(params: {
	screeningId: string;
	userId?: string;
}) {
	return useMutation({
		mutationFn: (payload: ScreeningStepTwoPayload) =>
			updateStepTwo(params.screeningId, payload),
		onSettled: () =>
			centralScreeningInvalidation({
				type: "step",
				screeningId: params.screeningId,
				userId: params.userId,
			}),
	});
}

export function useUpdateScreeningStepThree(params: {
	screeningId: string;
	userId?: string;
}) {
	return useMutation({
		mutationFn: (payload: ScreeningStepThreePayload) =>
			updateStepThree(params.screeningId, payload),
		onSettled: () =>
			centralScreeningInvalidation({
				type: "step",
				screeningId: params.screeningId,
				userId: params.userId,
			}),
	});
}

export function useUpdateScreeningStepFour(params: {
	screeningId: string;
	userId?: string;
}) {
	return useMutation({
		mutationFn: (payload: ScreeningStepFourPayload) =>
			updateStepFour(params.screeningId, payload),
		onSettled: () =>
			centralScreeningInvalidation({
				type: "step",
				screeningId: params.screeningId,
				userId: params.userId,
			}),
	});
}

export function useCompleteScreening(params: {
	screeningId: string;
	userId?: string;
}) {
	return useMutation({
		mutationFn: (payload: ScreeningStepFivePayload) =>
			completeStepFive(params.screeningId, payload),
		onSettled: () =>
			centralScreeningInvalidation({
				type: "complete",
				screeningId: params.screeningId,
				userId: params.userId,
			}),
	});
}
