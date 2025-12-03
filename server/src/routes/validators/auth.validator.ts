import { z } from "zod";

export const updateProfileSchema = z
	.object({
		name: z.string().trim().min(1, "Name is required").max(120).optional(),
		image: z.string().url("Image must be a valid URL").optional(),
		email: z.string().email("Invalid email address").optional(),
	})
	.refine(
		(value) => Object.values(value).some((field) => field !== undefined),
		{ message: "Provide at least one field to update" }
	);
