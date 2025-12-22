import { queryClient } from "@/shared/config/react-query.config";
import { queryKeys } from "@/shared/lib/react-query/query-keys.lib";

export function invalidateStateMappingGraph() {
	return queryClient.invalidateQueries({
		queryKey: queryKeys.stateMapping.graph(),
	});
}
