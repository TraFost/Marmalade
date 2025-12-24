import { motion } from "motion/react";

import { cn } from "@/shared/lib/helper/classname";
import type { Mood } from "@/features/session/types/session.type";

interface Props {
	mood: Mood;
	crisisMode: boolean;
}

const gradients = {
	calm: "from-slate-800/20 via-slate-900 to-slate-950",
	anxious: "from-violet-900/30 via-indigo-900/20 to-slate-950",
	warm: "from-orange-500/10 via-amber-900/20 to-slate-950",
	crisis: "from-teal-900/40 via-teal-950 to-slate-950",
};

export function AmbientBackground({ mood, crisisMode }: Props) {
	const activeGradient = crisisMode ? gradients.crisis : gradients[mood];

	return (
		<div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
			<motion.div className="absolute inset-0 bg-slate-950" initial={false} />

			<motion.div
				key={crisisMode ? "crisis" : mood}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 2, ease: "easeInOut" }}
				className={cn(
					"absolute inset-0 bg-gradient-radial blur-3xl",
					activeGradient
				)}
			/>

			<motion.div
				animate={{
					scale: [1, 1.2, 1],
					opacity: [0.3, 0.5, 0.3],
					rotate: [0, 90, 0],
				}}
				transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
				className={cn(
					"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px]",
					crisisMode
						? "bg-teal-500/10"
						: mood === "anxious"
						? "bg-violet-600/10"
						: mood === "warm"
						? "bg-orange-500/10"
						: "bg-slate-700/10"
				)}
			/>
		</div>
	);
}
