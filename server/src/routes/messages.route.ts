import { Hono } from "hono";

import {
	type AuthContext,
	authMiddleware,
} from "../libs/middlewares/auth.middleware";
import { zValidator } from "../libs/middlewares/zod.middleware";
import { textMessageSchema } from "./validators/messages.validator";
import { handleError } from "../libs/helper/error.helper";
import { successWithData } from "../libs/helper/response.helper";
import { SessionService } from "../services/session.service";
import { MessageRepository } from "../repositories/message.repository";
import { ConversationService } from "../services/conversation.service";
import { db } from "../libs/db/db.lib";
import type {
	TextMessageRequest,
	TextMessageResponse,
} from "shared/src/types/message.type";

const sessionService = new SessionService();
const messageRepository = new MessageRepository();
const conversationService = new ConversationService();

const messagesRoute = new Hono<{ Variables: AuthContext }>()
	.use("*", authMiddleware)
	.post("/text", zValidator("json", textMessageSchema), async (c) => {
		try {
			const user = c.get("user");
			const body = c.req.valid("json") as TextMessageRequest;

			const session = await sessionService.ensureSession(
				user!.id,
				body.sessionId
			);

			await db.transaction(async (tx) => {
				await messageRepository.create(
					{
						userId: user!.id,
						sessionId: session.id,
						role: "user",
						content: body.message,
					},
					tx
				);

				await sessionService.incrementMessageCount(session.id, 1, tx);
			});

			const turn = await conversationService.handleUserTurn(
				user!.id,
				session.id,
				body.message
			);

			const response: TextMessageResponse = {
				...turn,
				sessionId: session.id,
			};

			return c.json(successWithData("Assistant replied", response), 200);
		} catch (error) {
			return handleError(c, error);
		}
	});

	.get("/events", async (c) => {
        try {
            const user = c.get("user");
            const sessionId = c.req.query("sessionId") as string | undefined;
            if (!sessionId) return c.json({ message: "sessionId required" }, 400);

            const { getEmitter, deleteEmitter } = await import("../libs/events/event-bus");
            const emitter = getEmitter(sessionId);

            const stream = new ReadableStream({
                start(controller) {
                    const onData = (data: any) => {
                        const s = `event: phase\ndata: ${JSON.stringify(data)}\n\n`;
                        controller.enqueue(new TextEncoder().encode(s));
                    };

                    const onEnd = () => {
                        const s = `event: end\ndata: {}\n\n`;
                        controller.enqueue(new TextEncoder().encode(s));
                        controller.close();
                    };

                    emitter.on("phase", onData);
                    emitter.once("end", onEnd);

                    controller.enqueue(new TextEncoder().encode("event: open\ndata: {}\n\n"));
                },
                cancel() {},
            });

            return new Response(stream, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            });
        } catch (error) {
            return handleError(c, error);
        }
    });

export default messagesRoute;
