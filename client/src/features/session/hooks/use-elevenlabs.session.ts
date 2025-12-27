import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";

import { env } from "@/shared/config/env.config";
import { useAuth } from "@/shared/hooks/use-auth.hook";
import {
	endSession as endServerSession,
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
	end: () => Promise<void>;
	sendText: (text: string) => void;
	sendTyping: () => void;
};

function extractMessageText(message: any): { text: string; isDelta: boolean } {
	if (!message || typeof message !== "object")
		return { text: "", isDelta: false };

	const text = message.text || message.message || message.content || "";
	const isDelta = message.type === "text_delta" || !!message.delta;

	if (text) return { text, isDelta };

	if (message.delta?.text || message.delta?.content) {
		return {
			text: message.delta.text || message.delta.content,
			isDelta: true,
		};
	}

	return { text: "", isDelta: false };
}

export function useElevenlabsSession(
	options: UseElevenlabsSessionOptions = {}
): UseElevenlabsSessionReturn {
	const [micMuted, setMicMuted] = useState(false);

	const conversation = useConversation({
		micMuted,
		onError: (err: any) => {
			setError(
				err instanceof Error ? err.message : String(err ?? "Conversation error")
			);
		},
		onMessage: (m) => {
			const { text, isDelta } = extractMessageText(m);
			if (!text) return;

			if (isDelta) {
				setLastText((prev) => prev + text);
			} else {
				setLastText(text);
			}
		},
		onModeChange: (payload: any) => {
			const nextMode = typeof payload === "string" ? payload : payload?.mode;

			if (nextMode === "speaking" || nextMode === "listening") {
				setMode(nextMode as ElevenLabsMode);
				if (nextMode === "speaking") setLastText("");
				return;
			}
			setMode("unknown");
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

	const { autoStart = true } = options;
	const { user } = useAuth();
	const userId = (user as any)?.user?.id ?? (user as any)?.userId ?? undefined;

	const [mode, setMode] = useState<ElevenLabsMode>("unknown");
	const [phase, setPhase] = useState<Phase>("idle");
	const [lastText, setLastText] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [internalSessionId, setInternalSessionId] = useState<string | null>(
		null
	);
	const [sessionMood, setSessionMood] = useState<Mood>("calm");

	const internalSessionIdRef = useRef<string | null>(null);
	const startingRef = useRef<Promise<void> | null>(null);
	const endingRef = useRef<Promise<void> | null>(null);
	const esRef = useRef<EventSource | null>(null);
	const statusRef = useRef(safeStatus);
	const hasAutoStarted = useRef(false);

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

				const sid = await startSession();
				setInternalSessionId(sid);

				await (conversation as any).startSession({
					agentId,
					connectionType: "webrtc",
					...(userId ? { userId: String(userId) } : {}),
					sessionId: sid,
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
	}, [conversation, userId]);

	const end = useCallback(async () => {
		if (endingRef.current) return endingRef.current;
		endingRef.current = (async () => {
			try {
				esRef.current?.close();
				esRef.current = null;
				setPhase("idle");

				await (conversation as any).endSession();
			} catch (e) {
				setError(e instanceof Error ? e.message : "Failed to end conversation");
			}

			if (internalSessionId) {
				try {
					await endServerSession(internalSessionId);
				} catch {
					/* ignore */
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
			if (!text.trim()) return;
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
		statusRef.current = safeStatus;
	}, [safeStatus]);

	useEffect(() => {
		internalSessionIdRef.current = internalSessionId;
	}, [internalSessionId]);

	useEffect(() => {
		if (!internalSessionId) return;

		const url = `${env.baseURL}/messages/events?sessionId=${internalSessionId}`;

		try {
			const es = new EventSource(url, { withCredentials: true });
			esRef.current = es;

			es.addEventListener("phase", (e: MessageEvent) => {
				try {
					const data = JSON.parse(e.data);
					if (data?.phase) setPhase(data.phase as Phase);
					if (data?.mood) setSessionMood(mapBackendMood(data.mood));
				} catch {}
			});

			es.onerror = () => {
				console.warn("SSE link failed. Check BETTER_AUTH_SECRET.");
			};
		} catch (err) {
			console.error("SSE Setup Error", err);
		}

		return () => {
			esRef.current?.close();
			esRef.current = null;
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
