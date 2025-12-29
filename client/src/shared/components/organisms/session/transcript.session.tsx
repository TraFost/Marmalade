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
		<section className="h-24 w-full max-w-md text-center flex flex-col items-center justify-center">
			{hasText ? (
				<p key="text">{text}</p>
			) : showDots ? (
				<MessageLoading key="dots" />
			) : null}
		</section>
	);
}
