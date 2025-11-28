import { defineConfig } from "drizzle-kit";
import { env } from "./src/configs/env.config";

export default defineConfig({
	schema: "./libs/db/schemas/index.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
});
