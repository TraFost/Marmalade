import { useState } from "react";
import { MessageLoading } from "@/shared/components/atoms/message-loading";
import { TextGenerateEffect } from "../../atoms/text-generate-effect";

type SessionTranscriptsProps = {
	text?: string;
	showDots?: boolean;
};

export function SessionTranscripts({
	text = "",
	showDots,
}: SessionTranscriptsProps) {
	const [isAnimating, setIsAnimating] = useState(false);
	const hasText = Boolean(text.trim().length);

	return (
		<section className="h-24 w-full max-w-md text-center flex flex-col items-center justify-center">
			{hasText ? (
				<TextGenerateEffect
					text={text}
					onStart={() => setIsAnimating(true)}
					onComplete={() => setIsAnimating(false)}
				/>
			) : showDots && !isAnimating ? (
				<MessageLoading key="dots" />
			) : null}
		</section>
	);
}
