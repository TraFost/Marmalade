import { authClient } from "@/shared/lib/auth/auth.lib";

interface AuthHook {
	signIn: () => Promise<unknown>;
}

export const useAuth = (): AuthHook => {
	const signIn = async () => {
		return await authClient.signIn.social({
			provider: "google",
			callbackURL: `${window.location.origin}/welcome`,
		});
	};

	return {
		signIn,
	};
};
