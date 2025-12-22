import { useQuery } from "@tanstack/react-query";

import { getStateMappingGraph } from "@/features/welcome/services/api.onboarding";
import { queryKeys } from "@/shared/lib/react-query/query-keys.lib";
import type { StateMappingGraphResponse } from "shared";

export function useStateMappingGraph() {
	return useQuery<StateMappingGraphResponse>({
		queryKey: queryKeys.stateMapping.graph(),
		queryFn: () => getStateMappingGraph(),
	});
}
