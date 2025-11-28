import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: text("id").primaryKey().notNull(),
	name: text("name"),
	email: text("email").notNull().unique(),
	emailVerified: timestamp("email_verified", { mode: "date" }),
	image: text("image"),
	createdAt: timestamp("created_at", { mode: "date" })
		.notNull()
		.default(sql`now()`),
	updatedAt: timestamp("updated_at", { mode: "date" })
		.notNull()
		.default(sql`now()`),
});

export const sessions = pgTable("sessions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});

export const accounts = pgTable("accounts", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "date" }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: "date" }),
	scope: text("scope"),
	idToken: text("id_token"),
	password: text("password"),
});

export const verifications = pgTable("verifications", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});
