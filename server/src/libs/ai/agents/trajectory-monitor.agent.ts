import type { StateDelta, UserStateGraph, UserStateRead } from "shared";

const abs = (n: number) => (n < 0 ? -n : n);

export const detectDelta = (input: {
	graph: UserStateGraph;
	currentRead?: UserStateRead | null;
}): StateDelta => {
	if (!input.currentRead) {
		return {
			changedNodes: ["narrativeCoherence"],
			narrativeCoherenceDelta: "unclear",
			notes: "no_current_read",
		};
	}

	const baseline = input.graph.baseline?.read ?? input.graph.lastRead ?? null;

	if (!baseline) {
		return {
			changedNodes: ["narrativeCoherence"],
			narrativeCoherenceDelta: "unclear",
			notes: "no_baseline",
		};
	}

	const changed: StateDelta["changedNodes"] = [];

	const score = (read: UserStateRead) => {
		const agitation = read.affectiveLoad.agitation;
		const volatility = read.affectiveLoad.volatility;
		const futureOpacity = read.temporalOrientation.futureOpacity;
		const perceivedControl = read.agencySignal.perceivedControl;
		const meaningOnline = read.flags.meaningMakingOnline ? 1 : 0;
		return (
			agitation * 0.3 +
			volatility * 0.2 +
			futureOpacity * 0.3 +
			(1 - perceivedControl) * 0.15 +
			(1 - meaningOnline) * 0.05
		);
	};

	const deltaScore = score(input.currentRead) - score(baseline);
	const coherenceDelta: StateDelta["narrativeCoherenceDelta"] =
		deltaScore > 0.08
			? "worsening"
			: deltaScore < -0.08
			? "improving"
			: "stagnant";

	const nodeChanged = (a: number, b: number) => abs(a - b) >= 0.2;

	if (
		nodeChanged(
			input.currentRead.affectiveLoad.agitation,
			baseline.affectiveLoad.agitation
		) ||
		nodeChanged(
			input.currentRead.affectiveLoad.sadness,
			baseline.affectiveLoad.sadness
		) ||
		nodeChanged(
			input.currentRead.affectiveLoad.numbness,
			baseline.affectiveLoad.numbness
		) ||
		nodeChanged(
			input.currentRead.affectiveLoad.volatility,
			baseline.affectiveLoad.volatility
		)
	) {
		changed.push("affectiveLoad");
	}

	if (
		nodeChanged(
			input.currentRead.agencySignal.perceivedControl,
			baseline.agencySignal.perceivedControl
		) ||
		nodeChanged(
			input.currentRead.agencySignal.decisionFatigue,
			baseline.agencySignal.decisionFatigue
		) ||
		nodeChanged(
			input.currentRead.agencySignal.futureOwnership,
			baseline.agencySignal.futureOwnership
		)
	) {
		changed.push("agencySignal");
	}

	if (
		nodeChanged(
			input.currentRead.temporalOrientation.futureOpacity,
			baseline.temporalOrientation.futureOpacity
		) ||
		nodeChanged(
			input.currentRead.temporalOrientation.presentOverwhelm,
			baseline.temporalOrientation.presentOverwhelm
		) ||
		nodeChanged(
			input.currentRead.temporalOrientation.pastFixation,
			baseline.temporalOrientation.pastFixation
		)
	) {
		changed.push("temporalOrientation");
	}

	if (
		baseline.flags.meaningMakingOnline !==
		input.currentRead.flags.meaningMakingOnline
	) {
		changed.push("narrativeCoherence");
	}

	if (
		nodeChanged(
			input.currentRead.trustBandwidth.openness,
			baseline.trustBandwidth.openness
		) ||
		nodeChanged(
			input.currentRead.trustBandwidth.resistance,
			baseline.trustBandwidth.resistance
		)
	) {
		changed.push("trustBandwidth");
	}

	if (
		nodeChanged(
			input.currentRead.languageSignature.intensity,
			baseline.languageSignature.intensity
		) ||
		nodeChanged(
			input.currentRead.languageSignature.rawness === "high"
				? 1
				: input.currentRead.languageSignature.rawness === "medium"
				? 0.5
				: 0,
			baseline.languageSignature.rawness === "high"
				? 1
				: baseline.languageSignature.rawness === "medium"
				? 0.5
				: 0
		)
	) {
		changed.push("languageSignature");
	}

	return {
		changedNodes: changed.length
			? Array.from(new Set(changed))
			: ["narrativeCoherence"],
		narrativeCoherenceDelta: coherenceDelta,
		notes: changed.length ? null : "no_material_delta",
	};
};
