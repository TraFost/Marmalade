import { AuthLoginPage } from "@/features/auth/pages/login.page";
import type { Page } from "./route";

export const AUTH_PAGES: Page[] = [
	{
		id: "auth-login",
		label: "Sign In",
		path: "/login",
		element: <AuthLoginPage />,
	},
] as const;
