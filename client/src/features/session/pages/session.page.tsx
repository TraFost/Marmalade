import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import { SessionTranscripts } from "@/shared/components/organisms/session/transcript.session";
import { AmbientBackground } from "@/shared/components/organisms/session/ambient-bg.session";
import { CognitiveOrb } from "@/shared/components/organisms/session/cognitive-orb.session";
import { SessionDock } from "@/shared/components/organisms/session/dock.session";

import type { Mood } from "@/features/session/types/session.type";
import { useElevenlabsSession } from "@/features/session/hooks/use-elevenlabs.session";

export function SessionPage() {
	const [mood] = useState<Mood>("calm");
	const {
		orbState,
		micMuted,
		setMicMuted,
		lastText,
		status,
		end,
		sendText,
		sendTyping,
	} = useElevenlabsSession({ autoStart: true });
	const showDots = status === "connecting" || orbState === "processing";

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
						onEndSession={() => void end()}
						onSendText={sendText}
						onUserTyping={sendTyping}
					/>
				</motion.footer>
			</AnimatePresence>
		</section>
	);
}
