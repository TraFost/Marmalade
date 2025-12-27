import { AnimatePresence } from "motion/react";
import { MessageLoading } from "@/shared/components/atoms/message-loading";

type SessionTranscriptsProps = {
	text?: string;
	showDots?: boolean;
};

export function SessionTranscripts({
	text = "",
	showDots = true,
}: SessionTranscriptsProps) {
	const hasText = Boolean(text.trim().length);
	return (
		<div className="h-24 w-full max-w-md text-center flex flex-col items-center justify-center">
			<AnimatePresence mode="popLayout">
				{hasText ? (
					<p key="text">{text}</p>
				) : showDots ? (
					<MessageLoading key="dots" />
				) : null}
			</AnimatePresence>
		</div>
	);
}
