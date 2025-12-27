import type { UserStateGraph, UserStateRead } from "shared";

const nowIso = () => new Date().toISOString();

export const appendReadToGraph = (input: {
	graph: UserStateGraph;
	read?: UserStateRead | null;
	delta?: any;
}): UserStateGraph => {
	if (!input.read) return input.graph;

	const next: UserStateGraph = {
		...input.graph,
		version: 1,
		updatedAt: nowIso(),
		lastRead: input.read,
		history: [
			...(input.graph.history ?? []),
			{ at: nowIso(), read: input.read, delta: input.delta ?? null },
		].slice(-80),
	};

	if (!next.baseline && input.read.confidence >= 0.6) {
		next.baseline = { read: input.read, setAt: nowIso() };
	}

	return next;
};
