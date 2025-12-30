import { Hono } from "hono";
import { MessageRepository } from "../repositories/message.repository";
import { SessionService } from "../services/session.service";
import { ConversationService } from "../services/conversation.service";
import { env } from "../configs/env.config";
import { db } from "../libs/db/db.lib";
import { logger } from "../libs/logger";
import { randomUUID } from "crypto";

const messageRepo = new MessageRepository();
const sessionService = new SessionService();
const conversationService = new ConversationService();

type OpenAIChatMessage = {
	role: string;
	content?:
		| string
		| Array<{
				type?: string;
				text?: string;
		  }>;
};

type OpenAIChatCompletionRequest = {
	messages: OpenAIChatMessage[];
	model?: string;
	stream?: boolean;
	user?: string;
	user_id?: string;
	session_id?: string;
	tools?: unknown;
	tool_choice?: unknown;
};

const randomizeMessageNotices = [
	"Let me reflect on that...",
	"I'm considering your words...",
	"That's an interesting point...",
	"Thinking deeply about this...",
	"That's a lot to ponder...",
	"I Hear you loud and clear...",
];

const getMessageText = (m: OpenAIChatMessage | undefined): string => {
	if (!m) return "";
	if (typeof m.content === "string") return m.content;
	if (Array.isArray(m.content)) {
		return m.content
			.map((p) => (typeof p?.text === "string" ? p.text : ""))
			.filter(Boolean)
			.join("\n");
	}
	return "";
};

const openAiError = (message: string, status = 400) =>
	new Response(
		JSON.stringify({
			error: {
				message,
				type: "invalid_request_error",
				Krauscode: "bad_request",
			},
		}),
		{ status, headers: { "Content-Type": "application/json" } }
	);

async function handleChatCompletions(c: any) {
	let body: OpenAIChatCompletionRequest;
	try {
		body = (await c.req.json()) as OpenAIChatCompletionRequest;

		logger.info({ body }, "[ElevenLabs] Incoming request body");
	} catch {
		return openAiError("Invalid JSON body", 400);
	}

	const model = body.model ?? "marmalade-backend";
	const wantsStream = Boolean(body.stream);

	const userIdFromHeader = c.req.header("x-user-id") as string | undefined;
	const sessionIdFromHeader = c.req.header("x-session-id") as
		| string
		| undefined;

	const providedUserId = (body.user_id ?? body.user ?? userIdFromHeader)
		?.toString()
		.trim();
	const userId = providedUserId || env.ELEVENLABS_DEFAULT_USER_ID;

	if (!userId) {
		return openAiError(
			"Missing user identifier. Provide `user_id` (body) or `x-user-id` (header).",
			400
		);
	}

	const incomingSessionId = (body.session_id ?? sessionIdFromHeader)
		?.toString()
		.trim();

	let sessionId: string | undefined = incomingSessionId || undefined;

	const userMessages = Array.isArray(body.messages) ? body.messages : [];
	const lastUser = [...userMessages].reverse().find((m) => m?.role === "user");
	const transcript = getMessageText(lastUser).trim();

	if (!transcript) {
		return openAiError("No user message content found", 400);
	}

	const created = Math.floor(Date.now() / 1000);
	const id = `chatcmpl-${Date.now()}`;

	const prepareTurn = async () => {
		const session = await sessionService.ensureSession(userId, sessionId);

		logger.info(
			{ userId, incomingSessionId, resolvedSessionId: session.id },
			"prepareTurn: session resolved"
		);

		const messageId = randomUUID();
		const createMessageAndInc = async () => {
			try {
				await db.transaction(async (tx) => {
					const { created } = await messageRepo.createIfNotExists(
						{
							messageId,
							userId,
							sessionId: session.id,
							role: "user",
							content: transcript,
							metadata: incomingSessionId
								? { externalSessionId: incomingSessionId }
								: undefined,
						},
						tx
					);

					if (created) {
						await sessionService.incrementMessageCount(session.id, 1, tx);
					}
				});
			} catch (err) {
				logger.error(
					{ err, userId, sessionId: session.id, messageId },
					"Background message create failed"
				);
			}
		};

		let usedWaitUntil = false;
		try {
			const ec = (c as any).executionCtx;
			if (ec && typeof ec.waitUntil === "function") {
				ec.waitUntil(createMessageAndInc());
				usedWaitUntil = true;
			}
		} catch (err) {
			logger.debug(
				{ err, userId, sessionId: session.id, messageId },
				"ExecutionContext not available; falling back to fire-and-forget"
			);
		}

		if (!usedWaitUntil) {
			createMessageAndInc().catch((err) =>
				logger.error(
					{ err, userId, sessionId: session.id, messageId },
					"Background message create failed"
				)
			);
		}

		return session;
	};

	if (!wantsStream) {
		try {
			const session = await prepareTurn();
			const turnController = conversationService.beginTurn(
				session.id,
				"new completion started"
			);
			let fullText = "";
			for await (const part of conversationService.handleUserTurnModelStream(
				userId,
				session.id,
				transcript,
				{ abortController: turnController }
			)) {
				if (part.text !== "...") {
					fullText += part.text;
				}
			}

			return new Response(
				JSON.stringify({
					id,
					object: "chat.completion",
					created,
					model,
					choices: [
						{
							index: 0,
							message: { role: "assistant", content: fullText.trim() },
							finish_reason: "stop",
						},
					],
				}),
				{ headers: { "Content-Type": "application/json" } }
			);
		} catch (e) {
			console.error("Non-streaming turn failed", e);
			return openAiError("Internal Server Error", 500);
		}
	}

	const encoder = new TextEncoder();
	let turnController: AbortController | null = null;
	let resolvedSessionId: string | null = null;
	const startTime = Date.now();

	const stream = new ReadableStream({
		async start(controller) {
			const send = (obj: unknown) => {
				if (Math.random() > 0.8)
					logger.debug({ obj }, "[ElevenLabs] Sending chunk");
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
			};

			try {
				const session = await prepareTurn();
				resolvedSessionId = session.id;
				turnController = conversationService.beginTurn(
					session.id,
					"new completion started"
				);

				send({
					id,
					object: "chat.completion.chunk",
					created,
					model,
					choices: [
						{
							index: 0,
							delta: { role: "assistant" },
							finish_reason: null,
						},
					],
				});

				let chunkCount = 0;
				let firstTokenTime: number | null = null;

				let keepaliveHandle: NodeJS.Timeout | null = setInterval(() => {
					send({
						id,
						object: "chat.completion.chunk",
						created,
						model,
						choices: [
							{
								index: 0,
								delta: { content: " " },
								finish_reason: null,
							},
						],
					});
				}, 2000);

				let watchdogHandle: NodeJS.Timeout | null = setTimeout(() => {
					send({
						id,
						object: "chat.completion.chunk",
						created,
						model,
						choices: [
							{
								index: 0,
								delta: {
									content: ` ${
										randomizeMessageNotices[
											Math.floor(Math.random() * randomizeMessageNotices.length)
										]
									} `,
								},
								finish_reason: null,
							},
						],
					});
					logger.info(
						{ id, message: "Watchdog triggered: sent reflecting message" },
						"[ElevenLabs] Watchdog"
					);
				}, 4000);

				for await (const chunk of conversationService.handleUserTurnModelStream(
					userId,
					session.id,
					transcript,
					{ abortController: turnController }
				)) {
					const content = chunk.text;

					if (!content || content.trim().length === 0) continue;

					if (!firstTokenTime) firstTokenTime = Date.now() - startTime;

					if (keepaliveHandle) {
						clearInterval(keepaliveHandle);
						keepaliveHandle = null;
					}
					if (watchdogHandle) {
						clearTimeout(watchdogHandle);
						watchdogHandle = null;
					}

					chunkCount++;
					send({
						id,
						object: "chat.completion.chunk",
						created,
						model,
						choices: [
							{
								index: 0,
								delta: { content: chunk.text },
								finish_reason: null,
							},
						],
					});
				}

				if (keepaliveHandle) {
					clearInterval(keepaliveHandle);
					keepaliveHandle = null;
				}
				if (watchdogHandle) {
					clearTimeout(watchdogHandle);
					watchdogHandle = null;
				}

				logger.info(
					{
						firstTokenLatency: `${firstTokenTime}ms`,
						totalChunks: chunkCount,
						totalTime: `${Date.now() - startTime}ms`,
					},
					"[ElevenLabs] Stream finished sending to ElevenLabs"
				);

				send({
					id,
					object: "chat.completion.chunk",
					created,
					model,
					choices: [
						{
							index: 0,
							delta: {},
							finish_reason: "stop",
						},
					],
				});

				controller.enqueue(encoder.encode("data: [DONE]\n\n"));
			} catch (e: any) {
				logger.error({ err: e.message }, "[ElevenLabs] Streaming turn error");

				if (e?.code === "TURN_ABORTED") {
					try {
						send({
							id,
							object: "chat.completion.chunk",
							created,
							model,
							choices: [
								{
									index: 0,
									delta: {},
									finish_reason: "stop",
								},
							],
						});
						controller.enqueue(encoder.encode("data: [DONE]\n\n"));
					} catch {
						// ignore
					}
					return;
				}
				send({
					id,
					object: "chat.completion.chunk",
					created,
					model,
					choices: [
						{
							index: 0,
							delta: {
								content: e.replyText || "Internal error occurred.",
							},
							finish_reason: "stop",
						},
					],
				});
			} finally {
				controller.close();
			}
		},
		cancel() {
			if (turnController && !turnController.signal.aborted) {
				try {
					turnController.abort(new Error("client disconnected"));
				} catch {
					// ignore
				}
			}

			if (resolvedSessionId && turnController) {
				conversationService.endTurn(resolvedSessionId, turnController);
			}
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			"X-Accel-Buffering": "no",
			Connection: "keep-alive",
		},
	});
}

const hooksRoute = new Hono().post(
	"/v1/chat/completions",
	handleChatCompletions
);

export default hooksRoute;
