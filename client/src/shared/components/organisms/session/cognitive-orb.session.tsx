import { useMemo } from "react";
import { motion } from "motion/react";
import { cn } from "@/shared/lib/helper/classname";

import type { Mood, OrbState } from "@/features/session/types/session.type";

const orbColors = {
	calm: "from-slate-200 to-slate-500",
	anxious: "from-violet-400 to-indigo-600",
	warm: "from-orange-400 to-amber-600",
	crisis: "from-teal-400 to-teal-700",
};

const variants: any = {
	idle: {
		scale: [1, 1.05, 1],
		opacity: 0.8,
		transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
	},
	listening: {
		scale: [1, 1.15, 1],
		opacity: 1,
		transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
	},
	processing: {
		scale: [0.9, 0.95, 0.9],
		rotate: 360,
		borderRadius: ["50%", "40%", "50%"],
		transition: { rotate: { duration: 2, repeat: Infinity, ease: "linear" } },
	},
	speaking: {
		scale: [1, 1.2, 0.9, 1.1, 1],
		opacity: 1,
		transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" },
	},
};

export function CognitiveOrb({
	orbState,
	mood,
	crisisMode,
}: {
	orbState: OrbState;
	mood: Mood;
	crisisMode: boolean;
}) {
	const orbColor = useMemo(() => {
		return crisisMode ? orbColors.crisis : orbColors[mood];
	}, [mood, crisisMode]);

	return (
		<div className="relative flex items-center justify-center w-64 h-64">
			{orbState === "listening" && (
				<>
					<motion.div
						className={cn(
							"absolute inset-0 rounded-full blur-xl opacity-20",
							orbColor
						)}
						animate={{ scale: [1, 2], opacity: [0.3, 0] }}
						transition={{ duration: 2, repeat: Infinity }}
					/>
					<motion.div
						className={cn(
							"absolute inset-0 rounded-full blur-xl opacity-20",
							orbColor
						)}
						animate={{ scale: [1, 2], opacity: [0.3, 0] }}
						transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
					/>
				</>
			)}

			<motion.div
				className={cn(
					"relative w-32 h-32 rounded-full bg-linear-to-br shadow-2xl z-10 flex items-center justify-center",
					orbColor,
					crisisMode
						? "shadow-teal-500/40"
						: mood === "warm"
						? "shadow-orange-500/40"
						: mood === "anxious"
						? "shadow-violet-500/40"
						: "shadow-slate-500/20"
				)}
				variants={variants}
				animate={orbState}
			>
				<div className="w-24 h-24 rounded-full bg-linear-to-tr from-white/30 to-transparent blur-sm" />
			</motion.div>
		</div>
	);
}
