import type { StateDelta, StateMappingSignals, UserStateGraph } from "shared";

export type ResponseClass =
	| "understanding"
	| "reflection"
	| "anchoring"
	| "grounding";

export type InterventionDecision = {
	responseClass: ResponseClass;
	groundingEligible: boolean;
	groundingReason: string | null;
};

export const decideIntervention = (input: {
	delta: StateDelta;
	graph?: UserStateGraph;
	signals?: StateMappingSignals | null;
}): InterventionDecision => {
	const { delta } = input;
	const willStatus = input.signals?.willStatus ?? null;
	const lifeAnchors = input.graph?.anchors?.lifeAnchors ?? [];

	let groundingEligible = false;
	let groundingReason: string | null = null;
	if (willStatus === "collapsed") {
		groundingEligible = true;
		groundingReason = "will_collapsed";
	} else if (willStatus === "strained") {
		groundingEligible = true;
		groundingReason = "will_strained";
	}

	if (groundingEligible) {
		return { responseClass: "grounding", groundingEligible, groundingReason };
	}

	if (delta.changedNodes.includes("meaningAnchors")) {
		return { responseClass: "anchoring", groundingEligible, groundingReason };
	}

	if (lifeAnchors.length > 0) {
		return { responseClass: "anchoring", groundingEligible, groundingReason };
	}

	if (delta.narrativeCoherenceDelta === "worsening") {
		return { responseClass: "reflection", groundingEligible, groundingReason };
	}

	return { responseClass: "understanding", groundingEligible, groundingReason };
};
