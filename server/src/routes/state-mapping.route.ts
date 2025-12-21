import { Hono } from "hono";

import type { AuthContext } from "../libs/middlewares/auth.middleware";
import { authMiddleware } from "../libs/middlewares/auth.middleware";
import { failure, successWithData } from "../libs/helper/response.helper";
import { StateMappingService } from "../services/state-mapping.service";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const stateMappingService = new StateMappingService();

const upsertSchema = z.object({
	signals: z
		.object({
			dass: z
				.object({
					depressionScore: z.number().nullable(),
					anxietyScore: z.number().nullable(),
					stressScore: z.number().nullable(),
				})
				.nullable()
				.optional(),
			sleepQuality: z.string().nullable().optional(),
			medicationStatus: z.string().nullable().optional(),
			medicationNotes: z.string().nullable().optional(),
			happinessScore: z.number().nullable().optional(),
			willStatus: z
				.enum(["stable", "strained", "collapsed", "unclear"])
				.nullable()
				.optional(),
			unfinishedLoops: z.string().nullable().optional(),
			painQualia: z.string().nullable().optional(),
			interactionPreference: z
				.enum(["direct", "soft", "analytical"])
				.nullable()
				.optional(),
			profile: z
				.object({
					gender: z.string().nullable().optional(),
					ageRange: z.string().nullable().optional(),
				})
				.nullable()
				.optional(),
		})
		.nullable()
		.optional(),
	anchors: z
		.object({
			goals: z.array(z.string()).optional(),
			lifeAnchors: z.array(z.string()).optional(),
			values: z.array(z.string()).optional(),
			rememberedDreams: z.array(z.string()).optional(),
		})
		.nullable()
		.optional(),
	patterns: z
		.object({
			recurringTimeWindows: z.array(z.string()).optional(),
			triggers: z.array(z.string()).optional(),
			collapseModes: z.array(z.string()).optional(),
		})
		.nullable()
		.optional(),
});

const stateMappingRoute = new Hono<{ Variables: AuthContext }>()
	.use("*", authMiddleware)
	.get("/graph", async (c) => {
		const user = c.get("user");
		if (!user?.id) return c.json(failure("Unauthorized"), 401);

		const graph = await stateMappingService.getGraph(user.id);
		return c.json(successWithData("State graph fetched", graph), 200);
	})
	.post("/upsert", zValidator("json", upsertSchema), async (c) => {
		const user = c.get("user");
		if (!user?.id) return c.json(failure("Unauthorized"), 401);

		const body = c.req.valid("json");
		const updated = await stateMappingService.upsert(user.id, body);
		return c.json(successWithData("State mapping updated", updated), 200);
	});

export default stateMappingRoute;
