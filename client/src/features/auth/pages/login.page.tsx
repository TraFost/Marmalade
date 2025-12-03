import { LoginForm } from "@/shared/components/organisms/auth/login";

import { useAuth } from "@/shared/hooks/use-auth.hook";

export function AuthLoginPage() {
	const { signIn } = useAuth();

	return <LoginForm onSignIn={signIn} />;
}
