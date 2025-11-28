import { sql } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: text("id").primaryKey().notNull(),
	email: text("email").notNull().unique(),
	name: text("name"),
	image: text("image"),
	createdAt: timestamp("created_at", { mode: "date" })
		.notNull()
		.default(sql`now()`),
	updatedAt: timestamp("updated_at", { mode: "date" })
		.notNull()
		.default(sql`now()`),
});
