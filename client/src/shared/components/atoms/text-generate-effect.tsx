import { motion } from "motion/react";
import { cn } from "@/shared/lib/helper/classname";

export const TextGenerateEffect = ({
	words,
	className,
	filter = true,
	duration = 0.5,
}: {
	words: string;
	className?: string;
	filter?: boolean;
	duration?: number;
}) => {
	const wordsArray = words.split(" ").filter(Boolean);

	return (
		<div className={cn("font-bold", className)}>
			<div className="mt-4">
				<div className="dark:text-white text-black text-2xl leading-snug tracking-wide">
					{wordsArray.map((word, idx) => (
						<motion.span
							key={`${word}-${idx}`}
							initial={{
								opacity: 0,
								filter: filter ? "blur(10px)" : "none",
								y: 5,
							}}
							animate={{
								opacity: 1,
								filter: filter ? "blur(0px)" : "none",
								y: 0,
							}}
							transition={{
								duration: duration,
								ease: "easeOut",
							}}
							className="inline-block dark:text-white text-black"
						>
							{word}&nbsp;
						</motion.span>
					))}
				</div>
			</div>
		</div>
	);
};
