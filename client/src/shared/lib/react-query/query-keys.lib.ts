export const queryKeys = {
	app: () => ["app"] as const,
	stateMapping: {
		graph: () => ["state-mapping", "graph"] as const,
	},
};

export type QueryKeyFactory = typeof queryKeys;
