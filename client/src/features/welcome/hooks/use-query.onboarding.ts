import { useQuery } from "@tanstack/react-query";

import {
	getScreening,
	getScreeningHistory,
} from "@/features/welcome/services/api.onboarding";
import { queryKeys } from "@/shared/lib/react-query/query-keys.lib";
import type {
	ScreeningHistoryEntry,
	ScreeningRecord,
} from "shared/src/types/screening.type";

export function useScreeningDetail(id: string | null) {
	return useQuery<ScreeningRecord>({
		enabled: Boolean(id),
		queryKey: queryKeys.screenings.detail(id),
		queryFn: () => getScreening(id as string),
	});
}

export function useScreeningHistory(userId: string | null) {
	return useQuery<ScreeningHistoryEntry[]>({
		enabled: Boolean(userId),
		queryKey: queryKeys.screenings.history(userId),
		queryFn: () => getScreeningHistory(userId as string),
	});
}
