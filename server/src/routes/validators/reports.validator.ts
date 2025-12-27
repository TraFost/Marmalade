import { z } from "zod";

export const generateSessionReportSchema = z.object({
	sessionId: z.string().uuid(),
	messageLimit: z.number().int().min(20).max(400).optional(),
});
