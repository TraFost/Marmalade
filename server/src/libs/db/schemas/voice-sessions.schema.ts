import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users.schema";
import { userMemoryDocs } from "./user-memory-docs.schema";

export const voiceSessions = pgTable("voice_sessions", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.references(() => users.id, { onDelete: "cascade" })
		.notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
	externalId: text("external_id"),
	maxRiskLevel: integer("max_risk_level").default(0).notNull(),
	messageCount: integer("message_count").default(0).notNull(),
	durationSeconds: integer("duration_seconds"),
	audioUrl: text("audio_url"),
	summaryDocId: uuid("summary_doc_id").references(() => userMemoryDocs.id, {
		onDelete: "set null",
	}),
});

export type VoiceSession = typeof voiceSessions.$inferSelect;
export type NewVoiceSession = typeof voiceSessions.$inferInsert;
