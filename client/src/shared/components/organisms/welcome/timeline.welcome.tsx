import { motion } from "motion/react";

const DOT_COUNT = 5;
const DOTS = Array.from({ length: DOT_COUNT });
const WEEK_LABELS = ["Week 1", "Week 2", "Week 3", "Week 4", "Today"] as const;

const PROGRESS_TRANSITION = {
	duration: 4,
	ease: "easeInOut" as const,
	repeat: Infinity,
};

const DOT_TRANSITION = {
	duration: 4,
	ease: "easeInOut" as const,
	repeat: Infinity,
};

const FLOATING_BADGES = [
	{
		index: 1,
		icon: (
			<path
				d="M8 3L9.5 6.5L13 7.5L10.5 10L11 14L8 12L5 14L5.5 10L3 7.5L6.5 6.5L8 3Z"
				fill="#ffd7a0"
				stroke="#f28c28"
				strokeWidth="1"
			/>
		),
		delay: 0.5,
	},
	{
		index: 2,
		icon: (
			<path
				d="M8 14C8 14 13 10 13 6.5C13 4 11 2 8 2C5 2 3 4 3 6.5C3 10 8 14 8 14Z"
				fill="#f28c28"
				stroke="#2a2a2a"
				strokeWidth="1"
			/>
		),
		delay: 1,
	},
	{
		index: 4,
		icon: (
			<>
				<path
					d="M3 5H13V12C13 12.5 12.5 13 12 13H4C3.5 13 3 12.5 3 12V5Z"
					fill="#ffecb3"
					stroke="#f28c28"
					strokeWidth="1"
				/>
				<path d="M3 5L8 9L13 5" stroke="#f28c28" strokeWidth="1" fill="none" />
			</>
		),
		delay: 1.5,
	},
] as const;

export function TimelineIllustration() {
	return (
		<div className="relative mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center">
			<div className="w-full px-4">
				<div className="relative h-32">
					<div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-border" />
					<motion.div
						className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-primary"
						animate={{ width: ["0%", "100%", "0%"] }}
						transition={PROGRESS_TRANSITION}
					/>
					<div className="absolute left-0 right-0 top-1/2 flex -translate-y-1/2 justify-between">
						{DOTS.map((_, index) => (
							<div key={`dot-${index}`} className="relative">
								<motion.div
									className="size-4 rounded-full border-2"
									animate={{
										backgroundColor: ["#ffffff", "#f28c28", "#ffffff"],
										borderColor: ["#ffd7a0", "#f28c28", "#ffd7a0"],
										scale: [1, 1.12, 1],
									}}
									transition={{ ...DOT_TRANSITION, delay: index * 0.8 }}
								/>
								<Badge iconIndex={index} />
							</div>
						))}
					</div>
					<div className="absolute left-0 right-0 top-full mt-4 flex justify-between text-[10px] text-muted-foreground">
						{WEEK_LABELS.map((label) => (
							<span key={label}>{label}</span>
						))}
					</div>
				</div>
				<motion.div
					className="mx-auto mt-12 max-w-[180px] rounded-xl border border-border/30 bg-card p-3 shadow-md"
					animate={{ y: [0, -2, 0] }}
					transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
				>
					<div className="flex items-center gap-2">
						<div className="flex size-6 items-center justify-center rounded-full bg-primary/20">
							<svg
								width="12"
								height="12"
								viewBox="0 0 12 12"
								fill="none"
								aria-hidden
							>
								<path
									d="M6 1L7.5 4.5L11 5.5L8.5 8L9 11L6 9.5L3 11L3.5 8L1 5.5L4.5 4.5L6 1Z"
									fill="#f28c28"
								/>
							</svg>
						</div>
						<div className="flex-1">
							<div className="h-1.5 w-full rounded-full bg-muted" />
							<div className="mt-1 h-1.5 w-2/3 rounded-full bg-muted/60" />
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	);
}

function Badge({ iconIndex }: { iconIndex: number }) {
	const badge = FLOATING_BADGES.find((item) => item.index === iconIndex);
	if (!badge) {
		return null;
	}

	return (
		<motion.div
			className="absolute -top-12 left-1/2 -translate-x-1/2"
			animate={{ y: [0, -4, 0] }}
			transition={{ ...DOT_TRANSITION, delay: badge.delay }}
		>
			<div className="flex size-8 items-center justify-center rounded-lg border border-border/30 bg-card shadow-md">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
					{badge.icon}
				</svg>
			</div>
		</motion.div>
	);
}
