import type { StateDelta, StateMappingSignals, UserStateGraph } from "shared";

import { buildLanguageMirrorPlan } from "./language-shaper.agent";
import { decideIntervention } from "./intervention-arbiter.agent";
import { detectDelta } from "./trajectory-monitor.agent";
import { appendReadToGraph } from "./memory-curator.agent";

export type CoordinatedTurn = {
	languagePlan: ReturnType<typeof buildLanguageMirrorPlan>;
	delta: StateDelta;
	decision: ReturnType<typeof decideIntervention>;
	nextGraph: UserStateGraph;
};

export const coordinateTurn = (input: {
	userMessage: string;
	graph: UserStateGraph;
	signals?: StateMappingSignals | null;
}): CoordinatedTurn => {
	const languagePlan = buildLanguageMirrorPlan(input.userMessage, {
		interactionPreference: input.signals?.interactionPreference ?? null,
		willStatus: input.signals?.willStatus ?? null,
	});
	const delta = detectDelta({
		graph: input.graph,
	});
	const decision = decideIntervention({
		delta,
		graph: input.graph,
		signals: input.signals ?? null,
	});
	const nextGraph = appendReadToGraph({
		graph: input.graph,
		delta,
	});
	return { languagePlan, delta, decision, nextGraph };
};
