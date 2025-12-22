export const queryKeys = {
	app: () => ["app"] as const,
	stateMapping: {
		graph: () => ["state-mapping", "graph"] as const,
	},
	session: {
		start: () => ["session", "start"] as const,
		detail: (id: string) => ["session", id] as const,
		list: () => ["session", "list"] as const,
		end: (id: string) => ["session", id, "end"] as const,
	},
};

export type QueryKeyFactory = typeof queryKeys;
