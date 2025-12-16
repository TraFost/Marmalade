import { axiosInstance } from "@/shared/lib/api/axios";
import type {
	QuickDassSummary,
	ScreeningCompletionResponse,
	ScreeningHistoryEntry,
	ScreeningRecord,
	ScreeningStartResponse,
	ScreeningStepFourPayload,
	ScreeningStepFourResponse,
	ScreeningStepOnePayload,
	ScreeningStepThreePayload,
	ScreeningStepTwoPayload,
	ScreeningStepUpdateResponse,
	ScreeningStepFivePayload,
} from "shared";
import type { ResponseWithData } from "shared";

const BASE = "/screenings";

export async function startScreening() {
	const response = await axiosInstance.post<
		ResponseWithData<ScreeningStartResponse>
	>(BASE);
	return response.data.data;
}

export async function updateStepOne(
	id: string,
	payload: ScreeningStepOnePayload
) {
	const response = await axiosInstance.put<
		ResponseWithData<ScreeningStepUpdateResponse>
	>(`${BASE}/${id}/step/1`, payload);
	return response.data.data;
}

export async function updateStepTwo(
	id: string,
	payload: ScreeningStepTwoPayload
) {
	const response = await axiosInstance.put<
		ResponseWithData<ScreeningStepUpdateResponse>
	>(`${BASE}/${id}/step/2`, payload);
	return response.data.data;
}

export async function updateStepThree(
	id: string,
	payload: ScreeningStepThreePayload
) {
	const response = await axiosInstance.put<
		ResponseWithData<ScreeningStepUpdateResponse>
	>(`${BASE}/${id}/step/3`, payload);
	return response.data.data;
}

export async function updateStepFour(
	id: string,
	payload: ScreeningStepFourPayload
) {
	const response = await axiosInstance.put<
		ResponseWithData<ScreeningStepFourResponse>
	>(`${BASE}/${id}/step/4`, payload);
	return response.data.data;
}

export async function completeStepFive(
	id: string,
	payload: ScreeningStepFivePayload
) {
	const response = await axiosInstance.put<
		ResponseWithData<ScreeningCompletionResponse>
	>(`${BASE}/${id}/step/5`, payload);
	return response.data.data;
}

export async function getScreening(id: string) {
	const response = await axiosInstance.get<ResponseWithData<ScreeningRecord>>(
		`${BASE}/${id}`
	);
	return response.data.data;
}

export async function getScreeningHistory(userId: string) {
	const response = await axiosInstance.get<
		ResponseWithData<ScreeningHistoryEntry[]>
	>(BASE, {
		params: { userId },
	});
	return response.data.data;
}

export type ScreeningDassSummary = QuickDassSummary;
