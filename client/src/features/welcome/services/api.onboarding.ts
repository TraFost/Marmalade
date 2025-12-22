import { axiosInstance } from "@/shared/lib/api/axios";
import type {
	StateMappingGraphResponse,
	StateMappingUpsertRequest,
} from "shared";
import type { ResponseWithData } from "shared";

const BASE = "/state-mapping";

export async function getStateMappingGraph() {
	const response = await axiosInstance.get<
		ResponseWithData<StateMappingGraphResponse>
	>(`${BASE}/graph`);
	return response.data.data;
}

export async function upsertStateMapping(payload: StateMappingUpsertRequest) {
	const response = await axiosInstance.post<
		ResponseWithData<StateMappingGraphResponse>
	>(`${BASE}/upsert`, payload);
	return response.data.data;
}

export type QuickDassInput = {
	flatJoy: number;
	motivation: number;
	physicalAnxiety: number;
	worry: number;
	restDifficulty: number;
	irritability: number;
};

export function computeQuickDassScores(input: QuickDassInput) {
	const dRaw = input.flatJoy + input.motivation;
	const aRaw = input.physicalAnxiety + input.worry;
	const sRaw = input.restDifficulty + input.irritability;

	const scale = (raw: number) => Math.round((raw / 6) * 14) * 2;

	return {
		depressionScore: scale(dRaw),
		anxietyScore: scale(aRaw),
		stressScore: scale(sRaw),
	};
}
