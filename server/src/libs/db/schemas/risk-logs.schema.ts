import {
	jsonb,
	pgTable,
	smallint,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { moodEnum } from "./conversation-state.schema";
import { voiceSessions } from "./voice-sessions.schema";
import { users } from "./users.schema";

export const riskLogs = pgTable("risk_logs", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.references(() => users.id, { onDelete: "cascade" })
		.notNull(),
	sessionId: uuid("session_id")
		.references(() => voiceSessions.id, { onDelete: "cascade" })
		.notNull(),
	riskLevel: smallint("risk_level").notNull(),
	mood: moodEnum("mood"),
	themes: jsonb("themes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.notNull(),
});

export type RiskLog = typeof riskLogs.$inferSelect;
export type NewRiskLog = typeof riskLogs.$inferInsert;
