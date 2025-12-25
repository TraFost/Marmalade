import { AnimatePresence, motion } from "motion/react";
import { TextGenerateEffect } from "@/shared/components/atoms/text-generate-effect";
import { MessageLoading } from "@/shared/components/atoms/message-loading";

type SessionTranscriptsProps = {
	text?: string;
	showDots?: boolean;
};

export function SessionTranscripts({
	text = "",
	showDots = true,
}: SessionTranscriptsProps) {
	return (
		<div className="h-24 w-full max-w-md text-center flex flex-col items-center justify-center">
			<AnimatePresence mode="popLayout">
				{showDots ? (
					<MessageLoading key="dots" />
				) : text ? (
					<motion.div
						key="text"
						initial={{ opacity: 0, y: 5 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-2xl font-medium tracking-tight text-white/90"
					>
						<TextGenerateEffect words={text} />
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}
