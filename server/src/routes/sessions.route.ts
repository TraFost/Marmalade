import { Hono } from "hono";

import {
	type AuthContext,
	authMiddleware,
} from "../libs/middlewares/auth.middleware";
import { zValidator } from "../libs/middlewares/zod.middleware";
import { SessionService } from "../services/session.service";
import { successWithData } from "../libs/helper/response.helper";
import { handleError } from "../libs/helper/error.helper";
import { endSessionSchema } from "./validators/sessions.validator";

const sessionService = new SessionService();

const sessionsRoute = new Hono<{ Variables: AuthContext }>()
	.use("*", authMiddleware)
	.post("/start", async (c) => {
		try {
			const user = c.get("user");
			const session = await sessionService.startSession(user!.id);
			return c.json(
				successWithData("Session started", { sessionId: session.id }),
				201
			);
		} catch (error) {
			return handleError(c, error);
		}
	})
	.post("/end", zValidator("json", endSessionSchema), async (c) => {
		try {
			const user = c.get("user");
			const body = c.req.valid("json");
			const summary = await sessionService.endSession(user!.id, body.sessionId);
			return c.json(
				successWithData("Session ended", {
					sessionId: body.sessionId,
					summaryDocId: summary.summaryDocId,
					summary: summary.summary,
				}),
				200
			);
		} catch (error) {
			return handleError(c, error);
		}
	});

export default sessionsRoute;
