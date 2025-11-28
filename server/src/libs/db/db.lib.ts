import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../../configs/env.config";
import * as schema from "./schemas";

type DBType = PostgresJsDatabase<typeof schema>;

declare global {
	var db: DBType | undefined;
}

export const client = postgres(env.DATABASE_URL, { prepare: false });
const drizzleConfig = {
	schema,
	driver: "pg",
	dbCredentials: {
		connectionString: env.DATABASE_URL,
	},
};

let db: DBType;
if (env.NODE_ENV === "production") {
	db = drizzle(client, drizzleConfig);
} else {
	if (!global.db) global.db = drizzle(client, drizzleConfig);

	db = global.db;
}

export { db };
