import {
	SCREENING_AGE_RANGES,
	SCREENING_GENDERS,
	SCREENING_MEDICATION_STATUSES,
	SCREENING_RISK_LEVELS,
	SCREENING_SEVERITY_LEVELS,
	SCREENING_SLEEP_QUALITIES,
	SCREENING_STATUSES,
} from "shared";

import {
	pgTable,
	uuid,
	text,
	integer,
	timestamp,
	boolean,
	pgEnum,
} from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const screeningStatusEnum = pgEnum(
	"screening_status",
	SCREENING_STATUSES
);
export const screeningGenderEnum = pgEnum(
	"screening_gender",
	SCREENING_GENDERS
);
export const screeningAgeRangeEnum = pgEnum(
	"screening_age_range",
	SCREENING_AGE_RANGES
);
export const screeningSleepQualityEnum = pgEnum(
	"screening_sleep_quality",
	SCREENING_SLEEP_QUALITIES
);
export const screeningMedicationStatusEnum = pgEnum(
	"screening_medication_status",
	SCREENING_MEDICATION_STATUSES
);
export const screeningSeverityEnum = pgEnum(
	"screening_severity",
	SCREENING_SEVERITY_LEVELS
);
export const screeningRiskLevelEnum = pgEnum(
	"screening_risk_level",
	SCREENING_RISK_LEVELS
);

export const screenings = pgTable("screenings", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.references(() => users.id, { onDelete: "set null" })
		.notNull(),
	status: screeningStatusEnum("status").notNull().default("in_progress"),
	currentStep: integer("current_step").notNull().default(1),
	startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
		.notNull()
		.defaultNow(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
	gender: screeningGenderEnum("gender"),
	ageRange: screeningAgeRangeEnum("age_range"),
	sleepQuality: screeningSleepQualityEnum("sleep_quality"),
	medicationStatus: screeningMedicationStatusEnum("medication_status"),
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
	dassDepressionLevel: screeningSeverityEnum("dass_depression_level"),
	dassAnxietyLevel: screeningSeverityEnum("dass_anxiety_level"),
	dassStressLevel: screeningSeverityEnum("dass_stress_level"),
	hasSeenPsychologist: boolean("has_seen_psychologist"),
	goals: text("goals").array(),
	riskLevel: screeningRiskLevelEnum("risk_level"),
	riskReason: text("risk_reason"),
});

export type Screening = typeof screenings.$inferSelect;
export type NewScreening = typeof screenings.$inferInsert;

export {
	SCREENING_GENDERS,
	SCREENING_AGE_RANGES,
	SCREENING_SLEEP_QUALITIES,
	SCREENING_MEDICATION_STATUSES,
	SCREENING_STATUSES,
	SCREENING_SEVERITY_LEVELS,
	SCREENING_RISK_LEVELS,
} from "shared";
export type {
	ScreeningGender,
	ScreeningAgeRange,
	ScreeningSleepQuality,
	ScreeningMedicationStatus,
	ScreeningStatus,
	ScreeningSeverityLevel,
	ScreeningRiskLevel,
} from "shared";
