import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";

import { SessionTranscripts } from "@/shared/components/organisms/session/transcript.session";
import { AmbientBackground } from "@/shared/components/organisms/session/ambient-bg.session";
import { CognitiveOrb } from "@/shared/components/organisms/session/cognitive-orb.session";
import { SessionDock } from "@/shared/components/organisms/session/dock.session";
import { ShiningText } from "@/shared/components/atoms/shining-text";

import type { Phase } from "@/features/session/types/session.type";
import { useElevenlabsSession } from "@/features/session/hooks/use-elevenlabs.session";

const phaseMessages = (phase: Phase): string | undefined => {
	if (phase === "idle") return undefined;

	const phases = {
		analyzing: "analyzing...",
		recalling: "recalling shared memories...",
		formulating: "formulating a reply...",
		replying: "replying...",
	};

	let message = "Marmalade is " + (phases[phase] ?? "");
	return message;
};

export function SessionPage() {
	const navigate = useNavigate();
	const {
		orbState,
		phase,
		mood,
		micMuted,
		setMicMuted,
		lastText,
		status,
		end,
		internalSessionId,
		sendText,
		sendTyping,
	} = useElevenlabsSession({ autoStart: true });

	const handleEndSession = useCallback(() => {
		const fallbackSessionId = internalSessionId;
		void (async () => {
			const endedAt = new Date().toISOString();
			let res:
				| {
						sessionId: string;
						endedAt?: string;
				  }
				| undefined;
			try {
				res = (await end()) as any;
			} catch {
				res = undefined;
			}

			const sid = res?.sessionId ?? fallbackSessionId;
			if (sid) {
				navigate(`/session/${sid}/result`, {
					state: {
						sessionId: sid,
						endedAt: res?.endedAt ?? endedAt,
					},
				});
			}
		})();
	}, [end, internalSessionId, navigate]);

	const showDots = useMemo(() => {
		return status === "connecting" || orbState === "processing";
	}, [status, orbState]);

	return (
		<section className="relative w-full min-h-dvh text-slate-50 selection:bg-primary/40 flex flex-col">
			<AmbientBackground mood={mood} crisisMode={false} />

			<main className="flex-1 flex flex-col items-center justify-center relative w-full max-w-2xl mx-auto px-6">
				<AnimatePresence mode="wait">
					<motion.div
						key="active"
						exit={{ opacity: 0, scale: 0.95 }}
						className="flex flex-col items-center justify-center w-full"
					>
						<div className="mb-12">
							<CognitiveOrb
								orbState={orbState}
								mood={mood}
								crisisMode={false}
							/>
							{phase !== "idle" && (
								<div className="mt-4 text-sm text-slate-300">
									<ShiningText text={phaseMessages(phase)!} />
								</div>
							)}
						</div>

						<SessionTranscripts text={lastText} showDots={showDots} />
					</motion.div>
				</AnimatePresence>
			</main>

			<AnimatePresence>
				<motion.footer
					exit={{ opacity: 0, y: 20 }}
					className="p-8 w-full flex justify-center items-center z-50"
				>
					<SessionDock
						micMuted={micMuted}
						onMicMutedChange={setMicMuted}
						onEndSession={handleEndSession}
						onSendText={sendText}
						onUserTyping={sendTyping}
					/>
				</motion.footer>
			</AnimatePresence>
		</section>
	);
}
