import {
	pgTable,
	uuid,
	text,
	integer,
	timestamp,
	boolean,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const SCREENING_GENDERS = ["male", "female", "other"] as const;
export const SCREENING_AGE_RANGES = [
	"16-20",
	"20-30",
	"30-40",
	"40-50",
	"50-60",
	"60+",
] as const;
export const SCREENING_SLEEP_QUALITIES = [
	"ideal",
	"good",
	"acceptable",
	"not_enough",
	"critically_low",
	"no_sleep_mode",
] as const;
export const SCREENING_MEDICATION_STATUSES = [
	"regular",
	"sometimes",
	"none",
] as const;

export type ScreeningGender = (typeof SCREENING_GENDERS)[number];
export type ScreeningAgeRange = (typeof SCREENING_AGE_RANGES)[number];
export type ScreeningSleepQuality = (typeof SCREENING_SLEEP_QUALITIES)[number];
export type ScreeningMedicationStatus =
	(typeof SCREENING_MEDICATION_STATUSES)[number];

export const screenings = pgTable("screenings", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.references(() => users.id, { onDelete: "set null" })
		.notNull(),
	status: text("status").notNull().default("in_progress"),
	currentStep: integer("current_step").notNull().default(1),
	startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
	gender: text("gender"),
	ageRange: text("age_range"),
	sleepQuality: text("sleep_quality"),
	medicationStatus: text("medication_status"),
	medicationNotes: text("medication_notes"),
	happinessScore: integer("happiness_score"),
	positiveSources: text("positive_sources").array(),
	qdFlatJoy: integer("qd_flat_joy"),
	qdMotivation: integer("qd_motivation"),
	qdPhysicalAnxiety: integer("qd_physical_anxiety"),
	qdWorry: integer("qd_worry"),
	qdRest: integer("qd_rest"),
	qdIrritability: integer("qd_irritability"),
	dassDepression: integer("dass_depression"),
	dassAnxiety: integer("dass_anxiety"),
	dassStress: integer("dass_stress"),
	dassDepressionLevel: text("dass_depression_level"),
	dassAnxietyLevel: text("dass_anxiety_level"),
	dassStressLevel: text("dass_stress_level"),
	hasSeenPsychologist: boolean("has_seen_psychologist"),
	goals: text("goals").array(),
	riskLevel: text("risk_level"),
	riskReason: text("risk_reason"),
});

export type Screening = typeof screenings.$inferSelect;
export type NewScreening = typeof screenings.$inferInsert;
