import { axiosInstance } from "@/shared/lib/api/axios";
import type { ResponseWithData, GenerateSessionReportResponse } from "shared";

const BASE_URL = "/reports";

export async function getSessionReport(body: {
	sessionId: string;
	messageLimit?: number;
}): Promise<GenerateSessionReportResponse> {
	const response = await axiosInstance.post<
		ResponseWithData<GenerateSessionReportResponse>
	>(`${BASE_URL}/session`, body);
	return response.data.data;
}
