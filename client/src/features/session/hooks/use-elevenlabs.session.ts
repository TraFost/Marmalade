import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";

import { env } from "@/shared/config/env.config";
import { useAuth } from "@/shared/hooks/use-auth.hook";
import {
	endSession as endServerSession,
	cancelTurn as cancelServerTurn,
	startSession,
} from "@/features/session/services/api.session";

import type {
	Mood,
	OrbState,
	Phase,
} from "@/features/session/types/session.type";

const mapBackendMood = (backendMood?: string | null): Mood => {
	if (backendMood === "calm") return "calm";
	if (backendMood === "anxious" || backendMood === "angry") return "anxious";
	return "warm";
};

const SESSION_STORAGE_KEY = "marmalade:sessionId";

type ElevenLabsStatus = "connected" | "connecting" | "disconnected";
type ElevenLabsMode = "speaking" | "listening" | "unknown";

type UseElevenlabsSessionOptions = {
	autoStart?: boolean;
};

type UseElevenlabsSessionReturn = {
	status: ElevenLabsStatus;
	mode: ElevenLabsMode;
	orbState: OrbState;
	phase: Phase;
	mood: Mood;
	micMuted: boolean;
	setMicMuted: (muted: boolean) => void;
	lastText: string;
	error: string | null;
	internalSessionId: string | null;
	start: () => Promise<void>;
	end: () => Promise<{
		sessionId: string;
		summaryDocId?: string;
		summary?: string;
		endedAt: string;
	} | void>;
	sendText: (text: string) => void;
	sendTyping: () => void;
};

function extractMessageText(message: any): {
	text: string;
	isDelta: boolean;
	id?: string | null;
} {
	if (!message || typeof message !== "object")
		return { text: "", isDelta: false, id: null };

	const type = message.type ?? message.event ?? null;
	const delta = message.delta ?? null;
	const textFromFields =
		message.text || message.message || message.content || "";
	const msgId =
		message.id ?? message.messageId ?? delta?.id ?? delta?.messageId ?? null;

	if (type === "text_delta" || delta) {
		const t = delta?.text || delta?.content || textFromFields || "";
		return { text: t, isDelta: true, id: msgId };
	}

	if (type === "transcript" || type === "final" || textFromFields) {
		return { text: String(textFromFields), isDelta: false, id: msgId };
	}

	return { text: "", isDelta: false, id: msgId };
}

export function useElevenlabsSession(
	options: UseElevenlabsSessionOptions = {}
): UseElevenlabsSessionReturn {
	const [micMuted, setMicMuted] = useState(false);
	const { autoStart = true } = options;
	const { user } = useAuth();
	const userId = useMemo(
		() => (user as any)?.user?.id ?? (user as any)?.userId ?? undefined,
		[user]
	);

	const [mode, setMode] = useState<ElevenLabsMode>("unknown");
	const [phase, setPhase] = useState<Phase>("idle");
	const [lastText, setLastText] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [internalSessionId, setInternalSessionId] = useState<string | null>(
		null
	);
	const [sessionMood, setSessionMood] = useState<Mood>("calm");

	const textAccumulator = useRef("");
	const lastMessageIdRef = useRef<string | null>(null);
	const internalSessionIdRef = useRef<string | null>(null);
	const lastModeRef = useRef<ElevenLabsMode>("unknown");
	const startingRef = useRef<Promise<void> | null>(null);
	const endingRef = useRef<ReturnType<
		UseElevenlabsSessionReturn["end"]
	> | null>(null);
	const esRef = useRef<EventSource | null>(null);
	const hasAutoStarted = useRef(false);

	const conversation = useConversation({
		micMuted,
		onError: (err: any) => {
			setError(
				err instanceof Error ? err.message : String(err ?? "Conversation error")
			);
		},
		onMessage: (m) => {
			const { text, isDelta, id } = extractMessageText(m);
			if (!text) return;

			if (id && lastMessageIdRef.current !== id) {
				textAccumulator.current = "";
				lastMessageIdRef.current = id;
			}

			console.log(text, "<<text");
			console.log(isDelta, id, "<<< additional information");

			if (isDelta) {
				textAccumulator.current = textAccumulator.current + text;
				setLastText(textAccumulator.current);
			} else {
				if (textAccumulator.current.length > text.length) {
					setLastText(textAccumulator.current);
					return;
				}
				textAccumulator.current = text;
				setLastText(text);
			}
		},
		onModeChange: (payload: any) => {
			const nextMode = typeof payload === "string" ? payload : payload?.mode;
			if (nextMode === "speaking" || nextMode === "listening") {
				const prevMode = lastModeRef.current;
				lastModeRef.current = nextMode as ElevenLabsMode;

				if (nextMode === "listening" && prevMode === "speaking") {
					const sid = internalSessionIdRef.current;
					if (sid) {
						void cancelServerTurn(sid).catch(() => {
							// best-effort
						});
					}
				}

				setMode(nextMode as ElevenLabsMode);
				if (nextMode === "speaking") {
					textAccumulator.current = "";
					lastMessageIdRef.current = null;
					setLastText("");
				}
				return;
			}
			setMode("unknown");
			lastModeRef.current = "unknown";
		},
		onDisconnect: () => {
			setMode("unknown");
			setPhase("idle");
		},
	});

	const status = (conversation as any)?.status as ElevenLabsStatus | undefined;
	const safeStatus: ElevenLabsStatus =
		status === "connected" || status === "connecting" ? status : "disconnected";
	const isSpeaking = Boolean((conversation as any)?.isSpeaking);

	const statusRef = useRef(safeStatus);

	useEffect(() => {
		statusRef.current = safeStatus;
	}, [safeStatus]);

	useEffect(() => {
		try {
			const stored = localStorage.getItem(SESSION_STORAGE_KEY);
			if (stored) {
				setInternalSessionId(stored);
				internalSessionIdRef.current = stored;
			}
		} catch (e) {
			console.warn("marmalade:session - failed to read storage", e);
		}
	}, []);

	const orbState: OrbState = useMemo(() => {
		if (safeStatus === "connecting") return "processing";
		if (safeStatus !== "connected") return "idle";
		if (isSpeaking || mode === "speaking") return "speaking";
		return "listening";
	}, [isSpeaking, mode, safeStatus]);

	const start = useCallback(async () => {
		if (statusRef.current === "connected" || statusRef.current === "connecting")
			return;
		if (startingRef.current) return startingRef.current;

		setError(null);
		const agentId = env.elevenLabsAgentId?.trim();
		if (!agentId) {
			setError("Missing ElevenLabs agent id");
			return;
		}

		startingRef.current = (async () => {
			try {
				await navigator.mediaDevices.getUserMedia({ audio: true });

				let sid =
					localStorage.getItem(SESSION_STORAGE_KEY) ||
					internalSessionIdRef.current;

				if (!sid) {
					sid = await startSession();
					setInternalSessionId(sid);
					internalSessionIdRef.current = sid;
					localStorage.setItem(SESSION_STORAGE_KEY, sid);
				}

				await (conversation as any).startSession({
					agentId,
					dynamicVariables: {
						system_user_id: userId ? String(userId) : "anonymous",
						system_session_id: sid,
					},
					connectionType: "webrtc",
				});
			} catch (_e) {
				try {
					const sid =
						localStorage.getItem(SESSION_STORAGE_KEY) ||
						internalSessionIdRef.current;

					const dynamicVariables = {
						system_user_id: userId ? String(userId) : "anonymous",
						system_session_id: sid,
					};
					if (!sid) {
						const fresh = await startSession();
						setInternalSessionId(fresh);
						internalSessionIdRef.current = fresh;
						localStorage.setItem(SESSION_STORAGE_KEY, fresh);
						await (conversation as any).startSession({
							agentId,
							connectionType: "webrtc",
							dynamicVariables,
						});
						return;
					}

					await (conversation as any).startSession({
						agentId,
						connectionType: "webrtc",
						dynamicVariables,
					});
				} catch (retryErr) {
					setError(
						retryErr instanceof Error ? retryErr.message : "Failed to start"
					);
				}
			}
		})();

		try {
			await startingRef.current;
		} finally {
			startingRef.current = null;
		}
	}, [conversation, userId]);

	const end = useCallback(async () => {
		if (endingRef.current) return endingRef.current;
		endingRef.current = (async () => {
			const sidToKill = internalSessionIdRef.current;
			const endedAt = new Date().toISOString();
			let endResult: {
				sessionId: string;
			} | null = null;
			try {
				esRef.current?.close();
				esRef.current = null;
				setPhase("idle");
				await (conversation as any).endSession();
			} catch (e) {
				setError(e instanceof Error ? e.message : "Failed to end");
			}

			if (sidToKill) {
				try {
					endResult = await endServerSession(sidToKill);
				} catch {
					/* ignore */
				}
				setInternalSessionId(null);
				internalSessionIdRef.current = null;
				localStorage.removeItem(SESSION_STORAGE_KEY);
			}

			return endResult
				? {
						...endResult,
						endedAt,
				  }
				: undefined;
		})();

		try {
			await endingRef.current;
		} finally {
			endingRef.current = null;
		}
	}, [conversation]);

	const sendText = useCallback(
		(text: string) => {
			if (!text.trim()) return;
			const sid = internalSessionIdRef.current;

			if (sid) {
				void cancelServerTurn(sid).catch(() => {});
			}

			(conversation as any).sendUserMessage(text.trim());
		},
		[conversation]
	);

	const sendTyping = useCallback(() => {
		(conversation as any).sendUserActivity();
	}, [conversation]);

	useEffect(() => {
		if (autoStart && !hasAutoStarted.current) {
			hasAutoStarted.current = true;
			void start();
		}
	}, [autoStart, start]);

	useEffect(() => {
		if (!internalSessionId) return;

		const url = `${env.baseURL}/messages/events?sessionId=${internalSessionId}`;
		let es: EventSource | null = null;

		try {
			es = new EventSource(url, { withCredentials: true });
			esRef.current = es;

			es.addEventListener("phase", (e: MessageEvent) => {
				try {
					const data = JSON.parse(e.data);
					if (data?.phase) setPhase(data.phase as Phase);
					if (data?.mood) setSessionMood(mapBackendMood(data.mood));
				} catch {}
			});

			es.onerror = () => {
				console.warn("SSE link failed. Possible connection timeout.");
			};
		} catch (err) {
			console.error("SSE Setup Error", err);
		}

		return () => {
			es?.close();
			if (esRef.current === es) esRef.current = null;
		};
	}, [internalSessionId]);

	return {
		status: safeStatus,
		mode,
		orbState,
		phase,
		mood: sessionMood,
		micMuted,
		setMicMuted,
		lastText,
		error,
		internalSessionId,
		start,
		end,
		sendText,
		sendTyping,
	};
}
