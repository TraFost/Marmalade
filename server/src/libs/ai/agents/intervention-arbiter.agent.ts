import type {
	StateDelta,
	StateMappingSignals,
	UserStateGraph,
	UserStateRead,
} from "shared";

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
	stateRead: UserStateRead;
	delta: StateDelta;
	graph?: UserStateGraph;
	signals?: StateMappingSignals | null;
}): InterventionDecision => {
	const { stateRead, delta } = input;
	const flags = stateRead.flags;
	const willStatus = input.signals?.willStatus ?? null;
	const lifeAnchors = input.graph?.anchors?.lifeAnchors ?? [];

	let groundingEligible =
		flags.agitationRising ||
		flags.cognitiveFragmentation ||
		!flags.meaningMakingOnline;

	let groundingReason: string | null = groundingEligible
		? flags.cognitiveFragmentation
			? "cognitive_fragmentation"
			: flags.agitationRising
			? "agitation_rising"
			: "meaning_making_offline"
		: null;

	// If willpower is low, lower the threshold for grounding and keep intervention size small.
	const lowAgency =
		stateRead.agencySignal.perceivedControl <= 0.3 ||
		stateRead.agencySignal.decisionFatigue >= 0.7;

	if (!groundingEligible && willStatus === "collapsed") {
		if (delta.narrativeCoherenceDelta !== "improving" || lowAgency) {
			groundingEligible = true;
			groundingReason = "will_collapsed";
		}
	}

	if (!groundingEligible && willStatus === "strained") {
		if (delta.narrativeCoherenceDelta === "worsening" || lowAgency) {
			groundingEligible = true;
			groundingReason = "will_strained";
		}
	}

	if (groundingEligible) {
		return { responseClass: "grounding", groundingEligible, groundingReason };
	}

	// If the user's future continuity is threatened and they have stated life anchors,
	// bias toward anchoring before abstract reflection.
	if (flags.futureContinuityThreatened && lifeAnchors.length > 0) {
		return { responseClass: "anchoring", groundingEligible, groundingReason };
	}

	if (delta.changedNodes.includes("meaningAnchors")) {
		return { responseClass: "anchoring", groundingEligible, groundingReason };
	}

	if (delta.narrativeCoherenceDelta === "worsening") {
		return { responseClass: "reflection", groundingEligible, groundingReason };
	}

	return { responseClass: "understanding", groundingEligible, groundingReason };
};
