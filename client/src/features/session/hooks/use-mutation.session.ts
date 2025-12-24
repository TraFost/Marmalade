import { useMutation } from "@tanstack/react-query";

import { startSession } from "@/features/session/services/api.session";
import { queryClient } from "@/shared/config/react-query.config";
import { queryKeys } from "@/shared/lib/react-query/query-keys.lib";

export function useStartSession() {
	return useMutation({
		mutationFn: () => startSession(),
		onSuccess: (sessionId: string, _vars, context: any) => {
			const realSession = {
				id: sessionId,
				startedAt: new Date().toISOString(),
			};

			queryClient.setQueryData(
				queryKeys.session.detail(sessionId),
				realSession
			);

			queryClient.setQueryData(queryKeys.session.list(), (old: any[] = []) => {
				if (!old || old.length === 0) return [realSession];
				return old.map((item) =>
					item && item.id === context?.optimisticId ? realSession : item
				);
			});
		},
		onMutate: async () => {
			const optimisticId = `optimistic-${Math.random()
				.toString(36)
				.slice(2, 9)}`;
			const optimisticSession = {
				id: optimisticId,
				startedAt: new Date().toISOString(),
				optimistic: true,
			};

			await queryClient.cancelQueries({ queryKey: queryKeys.session.list() });
			const previous = queryClient.getQueryData<any[]>(
				queryKeys.session.list()
			);
			queryClient.setQueryData(queryKeys.session.list(), (old: any[] = []) => [
				optimisticSession,
				...old,
			]);

			return { previous, optimisticId };
		},
		onError: (_err, _vars, context: any) => {
			if (context?.previous) {
				queryClient.setQueryData(queryKeys.session.list(), context.previous);
			}
		},
		onSettled: (_data, _error, _vars, context: any) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.session.list() });
			if (context?.optimisticId) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.session.detail(context.optimisticId),
				});
			}
		},
	});
}
