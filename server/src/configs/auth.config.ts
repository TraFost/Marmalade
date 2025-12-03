import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../libs/db/db.lib";
import * as schema from "../libs/db/schemas";

import { env } from "../configs/env.config";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
		usePlural: true,
	}),
	emailAndPassword: {
		enabled: false,
	},
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	baseURL: env.BASE_URL,
	trustedOrigins: [env.FRONTEND_URL],
});

export type AuthSession = typeof auth.$Infer.Session;
