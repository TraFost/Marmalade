import { z } from "zod";

export const textMessageSchema = z.object({
	sessionId: z.string().uuid().optional(),
	message: z.string().min(1).max(2000),
});
