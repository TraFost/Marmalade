import { queryClient } from "@/shared/config/react-query.config";
import { queryKeys } from "@/shared/lib/react-query/query-keys.lib";

export function invalidateScreeningDetail(id: string | number) {
	return queryClient.invalidateQueries({
		queryKey: queryKeys.screenings.detail(id),
	});
}

export function invalidateScreeningHistory(userId: string | number) {
	return queryClient.invalidateQueries({
		queryKey: queryKeys.screenings.history(userId),
	});
}

export function centralScreeningInvalidation(params: {
	type: "start" | "step" | "complete";
	screeningId?: string | number;
	userId?: string | number;
}) {
	const tasks: Promise<unknown>[] = [];
	if (params.userId) tasks.push(invalidateScreeningHistory(params.userId));
	if (params.screeningId)
		tasks.push(invalidateScreeningDetail(params.screeningId));
	return Promise.all(tasks);
}
