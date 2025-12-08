import { z } from "zod";

export const elevenLabsTurnSchema = z.object({
	user_id: z.string(),
	session_id: z.string().uuid(),
	transcript: z.string().min(1).max(4000),
	audio_segment_id: z.string().optional().nullable(),
});
