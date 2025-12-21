import {
	pgEnum,
	pgTable,
	text,
	jsonb,
	timestamp,
	uuid,
	vector,
	type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema";
import { voiceSessions } from "./voice-sessions.schema";

export const memoryDocTypeEnum = pgEnum("memory_doc_type", [
	"session_summary",
	"long_summary",
	"coping_insight",
	"life_anchor",
	"unfinished_loop",
	"phenomenology_probe",
	"goal",
	"pain_qualia",
]);

export const userMemoryDocs = pgTable("user_memory_docs", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.references(() => users.id, { onDelete: "cascade" })
		.notNull(),
	sessionId: uuid("session_id")
		.references((): AnyPgColumn => voiceSessions.id, { onDelete: "cascade" })
		.notNull(),
	content: text("content").notNull(),
	metadata: jsonb("metadata").notNull(),
	type: memoryDocTypeEnum("type").notNull(),
	embedding: vector("embedding", { dimensions: 768 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
});

export type UserMemoryDoc = typeof userMemoryDocs.$inferSelect;
export type NewUserMemoryDoc = typeof userMemoryDocs.$inferInsert;
