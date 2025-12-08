import {
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const moodEnum = pgEnum("conversation_mood", [
	"unknown",
	"calm",
	"sad",
	"anxious",
	"angry",
	"numb",
	"mixed",
]);

export const conversationStates = pgTable("conversation_state", {
	userId: text("user_id")
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),
	summary: text("summary"),
	mood: moodEnum("mood").default("unknown").notNull(),
	riskLevel: integer("risk_level").default(0).notNull(),
	lastThemes: text("last_themes").array(),
	baselineDepression: integer("baseline_depression"),
	baselineAnxiety: integer("baseline_anxiety"),
	baselineStress: integer("baseline_stress"),
	preferences: jsonb("preferences"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export type ConversationState = typeof conversationStates.$inferSelect;
export type NewConversationState = typeof conversationStates.$inferInsert;
