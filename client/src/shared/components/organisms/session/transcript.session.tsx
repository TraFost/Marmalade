import { AnimatePresence, motion } from "motion/react";

type SessionTranscriptsProps = {
	text?: string;
	showDots?: boolean;
};

export function SessionTranscripts({
	text = "",
	showDots = true,
}: SessionTranscriptsProps) {
	return (
		<div className="h-24 w-full max-w-md text-center flex flex-col items-center justify-end">
			<AnimatePresence mode="wait">
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -10 }}
					className="text-2xl font-medium tracking-tight text-transparent bg-clip-text bg-linear-to-b from-white to-white/60"
				>
					{text || ""}
				</motion.div>
			</AnimatePresence>

			{/* Loading Dot ... */}
			{showDots && (
				<div className="flex gap-1 mt-4 h-2">
					{[0, 1, 2].map((i) => (
						<motion.div
							key={i}
							className="w-1 h-1 rounded-full bg-slate-600"
							animate={{ y: [0, -4, 0] }}
							transition={{
								duration: 0.6,
								repeat: Infinity,
								delay: i * 0.1,
							}}
						/>
					))}
				</div>
			)}
		</div>
	);
}
