import { Hono } from "hono";

import { elevenLabsTurnSchema } from "./validators/hooks.validator";
import { verifyElevenLabsSignature } from "../libs/helper/elevenlabs.helper";
import { env } from "../configs/env.config";
import { AppError } from "../libs/helper/error.helper";
import { MessageRepository } from "../repositories/message.repository";
import { SessionService } from "../services/session.service";
import { ConversationService } from "../services/conversation.service";
import { db } from "../libs/db/db.lib";
import type { ElevenLabsTurnWebhookPayload } from "shared/src/types/webhook.type";

const messageRepo = new MessageRepository();
const sessionService = new SessionService();
const conversationService = new ConversationService();

const hooksRoute = new Hono().post("/chat/completions", async (c) => {
	try {
		const signature = c.req.header("x-elevenlabs-signature") ?? null;
		const rawBody = await c.req.text();

		const validSignature = verifyElevenLabsSignature(
			rawBody,
			signature,
			env.ELEVENLABS_WEBHOOK_SECRET
		);
		if (!validSignature) {
			throw new AppError("Invalid signature", 401, "INVALID_SIGNATURE");
		}

		const parsed = elevenLabsTurnSchema.safeParse(
			JSON.parse(rawBody) as ElevenLabsTurnWebhookPayload
		);
		if (!parsed.success) {
			throw new AppError("Invalid payload", 400, "INVALID_PAYLOAD");
		}

		const payload = parsed.data;
		const session = await sessionService.ensureSession(
			payload.user_id,
			payload.session_id
		);

		await db.transaction(async (tx) => {
			await messageRepo.create(
				{
					userId: payload.user_id,
					sessionId: session.id,
					role: "user",
					content: payload.transcript,
					rawAudioRef: payload.audio_segment_id ?? undefined,
				},
				tx
			);
			await sessionService.incrementMessageCount(session.id, 1, tx);
		});

		const turn = await conversationService.handleUserTurn(
			payload.user_id,
			session.id,
			payload.transcript
		);

		return c.json({
			id: "chatcmpl-" + Date.now(),
			object: "chat.completion",
			created: Math.floor(Date.now() / 1000),
			model: "marmalade-backend",
			choices: [
				{
					index: 0,
					message: {
						role: "assistant",
						content: turn.replyText,
					},
					finish_reason: "stop",
				},
			],
		});
	} catch (error) {
		console.error("CRITICAL TURN ERROR:", error);

		return c.json(
			{
				response:
					"I... I lost my train of thought for a moment. Could you tell me that one more time?",
				metadata: {
					error: true,
					voice_mode: "confused",
				},
			},
			200
		);
	}
});

export default hooksRoute;
