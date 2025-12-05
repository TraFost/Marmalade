import { authClient } from "@/shared/lib/auth/auth.lib";

import type { AuthSession } from "server/src/configs/auth.config";

type AuthHook = {
	user: AuthSession | null;
	loading: boolean;
	signIn: VoidFunction;
	logout: VoidFunction;
};

export const useAuth = (): AuthHook => {
	const { data, isPending } = authClient.useSession();

	const signIn = async () => {
		await authClient.signIn.social({
			provider: "google",
			callbackURL: `${window.location.origin}/welcome`,
		});
	};

	const logout = async () => {
		await authClient.signOut();
	};

	return {
		user: data,
		loading: isPending,
		signIn,
		logout,
	};
};
