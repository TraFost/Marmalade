import { Hono } from "hono";

import {
	type AuthContext,
	authMiddleware,
} from "../libs/middlewares/auth.middleware";
import { zValidator } from "../libs/middlewares/zod.middleware";
import { SessionService } from "../services/session.service";
import { successWithData } from "../libs/helper/response.helper";
import { handleError } from "../libs/helper/error.helper";
import { logger } from "../libs/logger";
import {
	cancelSessionSchema,
	endSessionSchema,
} from "./validators/sessions.validator";
import { ConversationService } from "../services/conversation.service";

const sessionService = new SessionService();
const conversationService = new ConversationService();

const sessionsRoute = new Hono<{ Variables: AuthContext }>()
	.use("*", authMiddleware)
	.post("/start", async (c) => {
		try {
			const user = c.get("user");
			const session = await sessionService.startSession(user!.id);
			logger.info(
				{ userId: user!.id, sessionId: session.id },
				"Session started"
			);
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
			logger.info(
				{ userId: user!.id, sessionId: body.sessionId },
				"Session ended"
			);
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
	})
	.post("/cancel", zValidator("json", cancelSessionSchema), async (c) => {
		try {
			const user = c.get("user");
			const body = c.req.valid("json") as { sessionId: string };

			const session = await sessionService.ensureSession(
				user!.id,
				body.sessionId
			);
			conversationService.abortTurn(session.id, "client interrupt");
			logger.info(
				{ userId: user!.id, sessionId: session.id },
				"Session turn cancelled"
			);
			return c.json(
				successWithData("Turn cancelled", { sessionId: session.id }),
				200
			);
		} catch (error) {
			return handleError(c, error);
		}
	});

export default sessionsRoute;
