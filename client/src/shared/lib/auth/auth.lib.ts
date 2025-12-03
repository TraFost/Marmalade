import { createAuthClient } from "better-auth/react";
import { env } from "@/shared/config/env.config";

console.log("API Base URL:", env.baseURL.split("/api")[0]);

export const authClient = createAuthClient({
	baseURL: env.baseURL.split("/api")[0],
});
