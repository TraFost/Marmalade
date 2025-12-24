import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";

import { env } from "@/shared/config/env.config";
import { useAuth } from "@/shared/hooks/use-auth.hook";
import {
	endSession as endServerSession,
	startSession,
} from "@/features/session/services/api.session";

import type { OrbState } from "@/features/session/types/session.type";

type ElevenLabsStatus = "connected" | "connecting" | "disconnected";
type ElevenLabsMode = "speaking" | "listening" | "unknown";

type UseElevenlabsSessionOptions = {
	autoStart?: boolean;
};

type Phase = "idle" | "analyzing" | "recalling" | "formulating" | "replying";

type UseElevenlabsSessionReturn = {
	status: ElevenLabsStatus;
	mode: ElevenLabsMode;
	orbState: OrbState;
	phase: Phase;
	micMuted: boolean;
	setMicMuted: (muted: boolean) => void;
	lastText: string;
	error: string | null;
	internalSessionId: string | null;
	start: () => Promise<void>;
	end: () => Promise<void>;
	sendText: (text: string) => void;
	sendTyping: () => void;
};

function extractMessageText(message: unknown): string {
	if (!message || typeof message !== "object") return "";
	const anyMessage = message as any;

	const directText =
		(typeof anyMessage.text === "string" && anyMessage.text) ||
		(typeof anyMessage.message === "string" && anyMessage.message) ||
		(typeof anyMessage.content === "string" && anyMessage.content) ||
		"";
	if (directText) return directText;

	const maybeDelta = anyMessage?.delta;
	if (maybeDelta && typeof maybeDelta === "object") {
		const deltaText =
			(typeof maybeDelta.text === "string" && maybeDelta.text) ||
			(typeof maybeDelta.content === "string" && maybeDelta.content) ||
			"";
		if (deltaText) return deltaText;
	}

	return "";
}

export function useElevenlabsSession(
	options: UseElevenlabsSessionOptions = {}
): UseElevenlabsSessionReturn {
	const { autoStart: _autoStart = true } = options;

	const { user } = useAuth();
	const userId = (user as any)?.user?.id ?? (user as any)?.userId ?? undefined;

	const [micMuted, setMicMuted] = useState(false);
	const [mode, setMode] = useState<ElevenLabsMode>("unknown");
	const [phase, setPhase] = useState<Phase>("idle");
	const [lastText, setLastText] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [internalSessionId, setInternalSessionId] = useState<string | null>(
		null
	);
	const startingRef = useRef<Promise<void> | null>(null);
	const endingRef = useRef<Promise<void> | null>(null);
	const esRef = useRef<EventSource | null>(null);

	const conversation = useConversation({
		micMuted,
		onError: (err: any) => {
			setError(
				err instanceof Error ? err.message : String(err ?? "Conversation error")
			);
		},
		onMessage: (m) => {
			const text = extractMessageText(m);
			if (text) setLastText(text);
		},
		onModeChange: (payload: any) => {
			const nextMode =
				typeof payload === "string"
					? payload
					: typeof payload?.mode === "string"
					? payload.mode
					: "";

			if (nextMode === "speaking" || nextMode === "listening") {
				setMode(nextMode);
				return;
			}
			setMode("unknown");
		},
		onDisconnect: () => {
			setMode("unknown");
		},
	});

	const status = (conversation as any)?.status as ElevenLabsStatus | undefined;
	const safeStatus: ElevenLabsStatus =
		status === "connected" || status === "connecting" ? status : "disconnected";
	const isSpeaking = Boolean((conversation as any)?.isSpeaking);

	const orbState: OrbState = useMemo(() => {
		if (safeStatus === "connecting") return "processing";
		if (safeStatus !== "connected") return "idle";
		if (isSpeaking || mode === "speaking") return "speaking";
		return "listening";
	}, [isSpeaking, mode, safeStatus]);

	const start = useCallback(async () => {
		if (safeStatus === "connected" || safeStatus === "connecting") return;
		if (startingRef.current) return startingRef.current;
		setError(null);

		const agentId = env.elevenLabsAgentId?.trim();
		if (!agentId) {
			setError("Missing ElevenLabs agent id (VITE_ELEVENLABS_AGENT_ID)");
			return;
		}

		startingRef.current = (async () => {
			try {
				await navigator.mediaDevices.getUserMedia({ audio: true });

				try {
					const sid = await startSession();
					setInternalSessionId(sid);
				} catch (e) {
					setError(e instanceof Error ? e.message : "Failed to start session");
				}

				await (conversation as any).startSession({
					agentId,
					connectionType: "webrtc",
					...(userId ? { userId: String(userId) } : {}),
					...(internalSessionId ? { sessionId: internalSessionId } : {}),
				});
			} catch (e) {
				setError(
					e instanceof Error ? e.message : "Failed to start conversation"
				);
			}
		})();

		try {
			await startingRef.current;
		} finally {
			startingRef.current = null;
		}
	}, [conversation, safeStatus, userId]);

	const end = useCallback(async () => {
		if (endingRef.current) return endingRef.current;
		endingRef.current = (async () => {
			try {
				try {
					if (esRef.current) {
						esRef.current.close();
						esRef.current = null;
						setPhase("idle");
					}
				} catch {}
				await (conversation as any).endSession();
			} catch (e) {
				setError(e instanceof Error ? e.message : "Failed to end conversation");
			}

			const sid = internalSessionId;
			if (sid) {
				try {
					await endServerSession(sid);
				} catch {
					// non-fatal
				}
				setInternalSessionId(null);
			}
		})();

		try {
			await endingRef.current;
		} finally {
			endingRef.current = null;
		}
	}, [conversation, internalSessionId]);

	const sendText = useCallback(
		(text: string) => {
			const trimmed = text.trim();
			if (!trimmed) return;
			try {
				(conversation as any).sendUserMessage(trimmed);
			} catch {
				// ignore
			}
		},
		[conversation]
	);

	const sendTyping = useCallback(() => {
		try {
			(conversation as any).sendUserActivity();
		} catch {
			// ignore
		}
	}, [conversation]);

	// useEffect(() => {
	// 	if (!autoStart) return;
	// 	void start();
	// 	return () => {
	// 		void end();
	// 	};
	// }, [autoStart, end, start]);

	// Manage SSE connection for thought phases (persistent during session)
	useEffect(() => {
		if (!internalSessionId) return;
		const url = `${env.baseURL}/messages/events?sessionId=${internalSessionId}`;
		try {
			const es = new EventSource(url);
			es.onopen = () => {
				// initial idle state; the server also sends an 'open' event immediately
				setPhase("idle");
			};

			es.addEventListener("phase", (e: MessageEvent) => {
				try {
					const data = JSON.parse(e.data);
					if (data && typeof data.phase === "string") {
						setPhase(data.phase as any);
					}
				} catch {
					// ignore malformed phase events
				}
			});

			es.addEventListener("heartbeat", () => {
				// ignore — keeps the connection alive
			});

			es.addEventListener("end", () => {
				// server signals an 'end' for a phase but the stream remains open; reset to idle
				setPhase("idle");
			});

			es.onerror = (err) => {
				// Fail silently — do not surface to the user or break conversation
				console.warn("SSE connection error for session events", err);
			};

			esRef.current = es;
		} catch (err) {
			console.warn("Failed to open SSE for session events", err);
		}

		return () => {
			try {
				esRef.current?.close();
			} catch (e) {
				// ignore
			}
			esRef.current = null;
			setPhase("idle");
		};
	}, [internalSessionId]);

	return {
		status: safeStatus,
		mode,
		orbState,
		phase,
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
