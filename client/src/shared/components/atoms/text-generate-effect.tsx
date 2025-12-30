import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";

export function TextGenerateEffect({ text }: { text: string }) {
	const [displayedText, setDisplayedText] = useState("");
	const indexRef = useRef(0);

	useEffect(() => {
		if (text.length === 0) {
			setDisplayedText("");
			indexRef.current = 0;
			return;
		}

		if (text.length < displayedText.length) {
			setDisplayedText(text);
			indexRef.current = text.length;
			return;
		}

		const interval = setInterval(() => {
			if (indexRef.current < text.length) {
				setDisplayedText((prev) => prev + text.charAt(indexRef.current));
				indexRef.current++;
			} else {
				clearInterval(interval);
			}
		}, 25);

		return () => clearInterval(interval);
	}, [text, displayedText.length]);

	return (
		<motion.span>
			{displayedText}

			{indexRef.current < text.length && (
				<span className="inline-block w-1.5 h-4 ml-0.5 bg-primary/70 animate-pulse align-middle" />
			)}
		</motion.span>
	);
}
