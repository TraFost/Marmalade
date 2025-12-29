import { z } from "zod";

export const startSessionSchema = z.object({});

export const endSessionSchema = z.object({
	sessionId: z.string().uuid(),
});

export const cancelSessionSchema = z.object({
	sessionId: z.string().uuid(),
});
