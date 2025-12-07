type Primitive = string | number | boolean | null | undefined;

export const queryKeys = {
	app: () => ["app"] as const,
	screenings: {
		all: () => ["screenings"] as const,
		detail: (id: Primitive) => ["screenings", "detail", id] as const,
		history: (userId: Primitive) => ["screenings", "history", userId] as const,
	},
};

export type QueryKeyFactory = typeof queryKeys;
