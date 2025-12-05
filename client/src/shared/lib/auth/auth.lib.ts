import { createAuthClient } from "better-auth/react";
import { env } from "@/shared/config/env.config";

export const authClient = createAuthClient({
	baseURL: env.baseURL.split("/api")[0],
	fetchOptions: {
		credentials: "include",
	},
});
