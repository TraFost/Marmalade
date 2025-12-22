import { useMutation } from "@tanstack/react-query";

import type { StateMappingUpsertRequest } from "shared";

import { upsertStateMapping } from "@/features/welcome/services/api.onboarding";
import { invalidateStateMappingGraph } from "@/features/welcome/services/invalidations.onboarding";

export function useUpsertStateMapping() {
	return useMutation({
		mutationFn: (payload: StateMappingUpsertRequest) =>
			upsertStateMapping(payload),
		onSettled: () => invalidateStateMappingGraph(),
	});
}
