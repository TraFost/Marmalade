import { QueryClient } from "@tanstack/react-query";

const FIVE_MINUTES = 5 * 60 * 1000;
const THIRTY_MINUTES = 30 * 60 * 1000;

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: FIVE_MINUTES,
				gcTime: THIRTY_MINUTES,
				refetchOnWindowFocus: "always",
				retry: 1,
				retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
			},
			mutations: {
				onError: (error) => {
					// Fallback logging; replace with toast/telemetry in-app
					console.error("Mutation error", error);
				},
			},
		},
	});
}

export const queryClient = createQueryClient();
