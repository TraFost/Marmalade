import type { ReactNode } from "react";

import { AppRouter } from "@/app/router/route";
// import { QueryProvider } from '@/providers/query.provider';

export function AppProviders({ children }: { children: ReactNode }) {
	return (
		// <QueryProvider>
		<>
			<AppRouter />
			{children}
		</>
		// </QueryProvider>
	);
}
