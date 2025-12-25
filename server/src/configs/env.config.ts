import dotenv from "dotenv";
import { z } from "zod";

const nodeEnv = process.env.NODE_ENV ?? "development";

dotenv.config({ path: `.env.${nodeEnv}` });

export type EnvConfig = z.infer<typeof envSchema>;

console.log(`Loading environment variables for NODE_ENV=${nodeEnv}..`);

const envSchema = z.object({
	GOOGLE_CLOUD_PROJECT_ID: z.string().min(1),
	GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional(),
	VERTEX_LOCATION: z.string().min(1).default("us-central1"),
	VERTEX_MINI_MODEL: z.string().min(1).default("gemini-1.5-flash-001"),
	VERTEX_COUNSELOR_MODEL: z.string().min(1).default("gemini-1.5-pro-001"),
	VERTEX_EMBEDDING_MODEL: z.string().min(1).default("text-embedding-004"),
	CLOUDSQL_CONNECTION_NAME: z.string().min(1).optional(),
	DATABASE_URL: z.string().min(1),
	DATABASE_HOST: z.string().min(1).optional(),
	GOOGLE_CLIENT_ID: z.string().min(1),
	GOOGLE_CLIENT_SECRET: z.string().min(1),
	ELEVENLABS_WEBHOOK_SECRET: z.string().min(1),
	ELEVENLABS_DEFAULT_USER_ID: z.string().min(1).optional(),
	BASE_URL: z.string().min(1).default("http://localhost:3000"),
	FRONTEND_URL: z.string().min(1).default("http://localhost:5173"),
	PORT: z
		.string()
		.min(1)
		.default("8080")
		.transform((s) => {
			const n = Number(s);
			if (Number.isNaN(n)) throw new Error("PORT must be a number");
			return n;
		}),
	NODE_ENV: z.enum(["development", "production"]).default("development"),
	JWT_SECRET: z.string().min(1),
	JWT_PUBLIC_KEY: z.string().min(1),
	BETTER_AUTH_SECRET_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("Invalid environment variables:");
	parsed.error.issues.forEach((issue) => {
		console.error(`- ${issue.path.join(".")}: ${issue.message}`);
	});
	throw new Error("Invalid environment variables");
}

console.log("Environment variables loaded");

export const env: EnvConfig = parsed.data;
