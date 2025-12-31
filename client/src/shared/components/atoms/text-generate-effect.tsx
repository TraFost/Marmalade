import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";

export function TextGenerateEffect({
	text,
	onStart,
	onComplete,
}: {
	text: string;
	onStart?: () => void;
	onComplete?: () => void;
}) {
	const [displayedText, setDisplayedText] = useState("");
	const indexRef = useRef(0);
	const startedRef = useRef(false);
	const completedRef = useRef(false);

	useEffect(() => {
		if (text.length === 0) {
			setDisplayedText("");
			indexRef.current = 0;
			if (!completedRef.current) {
				completedRef.current = true;
				onComplete?.();
			}
			startedRef.current = false;
			return;
		}

		if (text.length < displayedText.length) {
			setDisplayedText(text);
			indexRef.current = text.length;
			completedRef.current = true;
			startedRef.current = false;
			onComplete?.();
			return;
		}

		if (!startedRef.current) {
			startedRef.current = true;
			completedRef.current = false;
			onStart?.();
		}

		const interval = setInterval(() => {
			if (indexRef.current < text.length) {
				setDisplayedText((prev) => prev + text.charAt(indexRef.current));
				indexRef.current++;
			} else {
				clearInterval(interval);
				completedRef.current = true;
				startedRef.current = false;
				onComplete?.();
			}
		}, 50);

		return () => {
			clearInterval(interval);
			if (!completedRef.current) {
				completedRef.current = true;
				onComplete?.();
			}
		};
	}, [text, displayedText.length, onStart, onComplete]);

	return (
		<motion.span>
			{displayedText}

			{indexRef.current < text.length && (
				<span className="inline-block w-1.5 h-4 ml-0.5 bg-primary/70 animate-pulse align-middle" />
			)}
		</motion.span>
	);
}
