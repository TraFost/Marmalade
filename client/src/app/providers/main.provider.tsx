import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { AuthProvider } from "@/shared/contexts/auth.context";
import { queryClient } from "@/shared/config/react-query.config";

export function AppProviders({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>{children}</AuthProvider>
			{import.meta.env.DEV ? (
				<ReactQueryDevtools initialIsOpen={false} />
			) : null}
		</QueryClientProvider>
	);
}
