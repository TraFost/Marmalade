import { createContext, type PropsWithChildren } from "react";

import type { AuthSession } from "server/src/configs/auth.config.ts";
import { useAuth } from "../hooks/use-auth.hook";

type AuthContextValue = {
	user: AuthSession | null;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
	undefined
);

type AuthProviderProps = PropsWithChildren;

export const AuthProvider = ({ children }: AuthProviderProps) => {
	const { user } = useAuth();

	return (
		<AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
	);
};
