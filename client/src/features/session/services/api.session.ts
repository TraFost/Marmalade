import { axiosInstance } from "@/shared/lib/api/axios";
import type { ResponseWithData } from "shared";

const BASE_URL = "/sessions";

export async function startSession() {
	const response = await axiosInstance.post<
		ResponseWithData<{ sessionId: string }>
	>(`${BASE_URL}/start`);
	return response.data.data.sessionId;
}

export async function endSession(sessionId: string) {
	const response = await axiosInstance.post<
		ResponseWithData<{
			sessionId: string;
			summaryDocId: string;
			summary: string;
		}>
	>(`${BASE_URL}/end`, { sessionId });
	return response.data.data;
}
