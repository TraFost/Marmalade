import { z } from "zod";

import {
	SCREENING_AGE_RANGES,
	SCREENING_GENDERS,
	SCREENING_MEDICATION_STATUSES,
	SCREENING_SLEEP_QUALITIES,
} from "shared/src/types/screening.type";

const enumFrom = <const T extends readonly [string, ...string[]]>(values: T) =>
	z.enum(values);

export const stepOneSchema = z.object({
	gender: enumFrom(SCREENING_GENDERS),
	ageRange: enumFrom(SCREENING_AGE_RANGES),
});

export const stepTwoSchema = z.object({
	sleepQuality: enumFrom(SCREENING_SLEEP_QUALITIES),
	medicationStatus: enumFrom(SCREENING_MEDICATION_STATUSES),
	medicationNotes: z.string().optional().nullable(),
});

export const stepThreeSchema = z.object({
	happinessScore: z.number().int().min(1).max(10),
	positiveSources: z.array(z.string()).optional().default([]),
});

export const stepFourSchema = z.object({
	flatJoy: z.number().int().min(0).max(3),
	motivation: z.number().int().min(0).max(3),
	physicalAnxiety: z.number().int().min(0).max(3),
	worry: z.number().int().min(0).max(3),
	restDifficulty: z.number().int().min(0).max(3),
	irritability: z.number().int().min(0).max(3),
});

export const stepFiveSchema = z.object({
	hasSeenPsychologist: z.boolean(),
	goals: z.array(z.string()).optional().default([]),
});
