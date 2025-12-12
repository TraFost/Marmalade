import {
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	vector,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const memoryDocTypeEnum = pgEnum("memory_doc_type", [
	"session_summary",
	"long_summary",
	"coping_insight",
]);

export const userMemoryDocs = pgTable("user_memory_docs", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.references(() => users.id, { onDelete: "cascade" })
		.notNull(),
	content: text("content").notNull(),
	type: memoryDocTypeEnum("type").notNull(),
	embedding: vector("embedding", { dimensions: 768 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
});

export type UserMemoryDoc = typeof userMemoryDocs.$inferSelect;
export type NewUserMemoryDoc = typeof userMemoryDocs.$inferInsert;
