import { Hono } from "hono";
import { MessageRepository } from "../repositories/message.repository";
import { SessionService } from "../services/session.service";
import { ConversationService } from "../services/conversation.service";
import { env } from "../configs/env.config";
import { db } from "../libs/db/db.lib";

const messageRepo = new MessageRepository();
const sessionService = new SessionService();
const conversationService = new ConversationService();

const externalSessionToInternal = new Map<string, string>();

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

const isUuid = (value: string) =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		value
	);

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
				code: "bad_request",
			},
		}),
		{ status, headers: { "Content-Type": "application/json" } }
	);

async function handleChatCompletions(c: any) {
	let body: OpenAIChatCompletionRequest;
	try {
		body = (await c.req.json()) as OpenAIChatCompletionRequest;
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
			"Missing user identifier. Provide `user_id` (body) or `x-user-id` (header), or set ELEVENLABS_DEFAULT_USER_ID.",
			400
		);
	}

	const incomingSessionId = (body.session_id ?? sessionIdFromHeader)
		?.toString()
		.trim();
	let sessionId: string | undefined;

	if (incomingSessionId && isUuid(incomingSessionId)) {
		sessionId = incomingSessionId;
	} else if (incomingSessionId) {
		// ElevenLabs often provides a non-UUID conversation id.
		// Map it to a stable internal DB UUID so message history stays on one session.
		const key = `${userId}:${incomingSessionId}`;
		sessionId = externalSessionToInternal.get(key);
		if (!sessionId) {
			console.log(
				"Non-UUID session id received; will create a DB session and map it",
				incomingSessionId
			);
		}
	}

	const userMessages = Array.isArray(body.messages) ? body.messages : [];
	const lastUser = [...userMessages].reverse().find((m) => m?.role === "user");
	const transcript = getMessageText(lastUser).trim();
	if (!transcript) {
		return openAiError("No user message content found", 400);
	}

	const created = Math.floor(Date.now() / 1000);
	const id = `chatcmpl-${Date.now()}`;

	const runTurn = async () => {
		const session = await sessionService.ensureSession(userId, sessionId);

		if (incomingSessionId && !isUuid(incomingSessionId)) {
			const key = `${userId}:${incomingSessionId}`;
			if (!externalSessionToInternal.has(key)) {
				externalSessionToInternal.set(key, session.id);
			}
		}

		await db.transaction(async (tx) => {
			await messageRepo.create(
				{
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
			await sessionService.incrementMessageCount(session.id, 1, tx);
		});

		return conversationService.handleUserTurn(userId, session.id, transcript);
	};

	const runTurnStream = async function* () {
		const session = await sessionService.ensureSession(userId, sessionId);

		if (incomingSessionId && !isUuid(incomingSessionId)) {
			const key = `${userId}:${incomingSessionId}`;
			if (!externalSessionToInternal.has(key)) {
				externalSessionToInternal.set(key, session.id);
			}
		}

		await db.transaction(async (tx) => {
			await messageRepo.create(
				{
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
			await sessionService.incrementMessageCount(session.id, 1, tx);
		});

		for await (const chunk of conversationService.handleUserTurnModelStream(
			userId,
			session.id,
			transcript,
			{ bufferText: "Let me think about that... " }
		)) {
			yield chunk.text;
		}
	};

	if (!wantsStream) {
		try {
			const turn = await runTurn();
			return new Response(
				JSON.stringify({
					id,
					object: "chat.completion",
					created,
					model,
					choices: [
						{
							index: 0,
							message: { role: "assistant", content: turn.replyText },
							finish_reason: "stop",
						},
					],
				}),
				{ headers: { "Content-Type": "application/json" } }
			);
		} catch (e) {
			console.error("Custom LLM /chat/completions failed", e);
			return openAiError("Internal Server Error", 500);
		}
	}

	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			const send = (obj: unknown) =>
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
			const sendDone = () =>
				controller.enqueue(encoder.encode("data: [DONE]\n\n"));

			let roleSent = false;

			try {
				// OpenAI streaming protocol: first chunk must establish the message role.
				if (!roleSent) {
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
					roleSent = true;
				}

				for await (const part of runTurnStream()) {
					send({
						id,
						object: "chat.completion.chunk",
						created,
						model,
						choices: [
							{
								index: 0,
								delta: { content: part },
								finish_reason: null,
							},
						],
					});
				}

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

				sendDone();
				controller.close();
			} catch (e) {
				console.error("Custom LLM streaming failed", e);

				// Even on error, keep the stream semantically valid for strict clients.
				if (!roleSent) {
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
					roleSent = true;
				}

				send({
					id,
					object: "chat.completion.chunk",
					created,
					model,
					choices: [
						{
							index: 0,
							delta: { content: "I'm having a temporary issue... " },
							finish_reason: null,
						},
					],
				});
				sendDone();
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}

const hooksRoute = new Hono().post(
	"/v1/chat/completions",
	handleChatCompletions
);

export default hooksRoute;
