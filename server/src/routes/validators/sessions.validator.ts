import { z } from "zod";

export const startSessionSchema = z.object({});

export const endSessionSchema = z.object({
	sessionId: z.string().uuid(),
});
