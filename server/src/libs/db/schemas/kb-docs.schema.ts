import {
	pgTable,
	text,
	timestamp,
	uuid,
	vector,
	integer,
} from "drizzle-orm/pg-core";

export const kbDocs = pgTable("kb_docs", {
	id: uuid("id").defaultRandom().primaryKey(),
	title: text("title").notNull(),
	content: text("content").notNull(),
	topic: text("topic"),
	tags: text("tags").array(),
	minSeverity: integer("min_severity").default(0),
	embedding: vector("embedding", { dimensions: 768 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
});

export type KbDoc = typeof kbDocs.$inferSelect;
export type NewKbDoc = typeof kbDocs.$inferInsert;
