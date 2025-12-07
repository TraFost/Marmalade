import { Outlet, Navigate } from "react-router";
import { useAuth } from "@/shared/hooks/use-auth.hook";

export function AuthLayout() {
	const { user, loading } = useAuth();

	if (loading) return null;
	if (user) return <Navigate to="/welcome" replace />;

	return <Outlet />;
}
