import type { ReactNode } from "react";
import { AuthProvider } from "@/shared/contexts/auth.context";

export function AppProviders({ children }: { children: ReactNode }) {
	return <AuthProvider>{children}</AuthProvider>;
}
