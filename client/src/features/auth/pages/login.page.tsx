import Login from "@/shared/components/organisms/login/login";

import { useAuth } from "@/shared/hooks/auth.hook";

export function AuthLoginPage() {
	const { signIn } = useAuth();

	return <Login onSignIn={signIn} />;
}
