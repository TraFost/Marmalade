import { motion } from "motion/react";

const STACK_ANIMATION = {
	duration: 3,
	ease: "easeInOut" as const,
	repeat: Infinity,
};

const DECOR_ANIMATION = {
	duration: 4,
	ease: "easeInOut" as const,
	repeat: Infinity,
};

const CARD_STACK_CONFIG: { offset: string; bounce: number[]; delay: number }[] =
	[
		{
			offset: "translateX(8px) rotate(3deg)",
			bounce: [16, 13, 16],
			delay: 0.5,
		},
		{
			offset: "translateX(4px) rotate(1.5deg)",
			bounce: [8, 5, 8],
			delay: 0.25,
		},
	];

const QUESTION_LINES = [
	"w-full h-2.5 bg-foreground/80",
	"w-4/5 h-2.5 bg-foreground/60",
];

const ANSWER_PILLS = [
	"bg-muted border border-border/30",
	"bg-primary/20 border border-primary/40",
	"bg-muted border border-border/30",
];

export function CheckInIllustration() {
	return (
		<div className="relative mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center">
			<div className="relative h-[140px] w-[200px]">
				{CARD_STACK_CONFIG.map((card) => (
					<motion.div
						key={card.offset}
						className="absolute inset-0 rounded-xl border border-border/30 bg-card shadow-md"
						style={{ transform: card.offset }}
						animate={{ y: card.bounce }}
						transition={{ ...STACK_ANIMATION, delay: card.delay }}
					>
						<div className="space-y-2 p-4">
							<div className="h-2 w-16 rounded-full bg-muted" />
							<div className="h-2 w-full rounded-full bg-muted/60" />
							<div className="h-2 w-3/4 rounded-full bg-muted/40" />
						</div>
					</motion.div>
				))}

				<div className="absolute inset-0 rounded-xl border border-border/50 bg-card shadow-lg">
					<div className="space-y-3 p-4">
						<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
							<QuestionGlyph />
						</div>
						<div className="space-y-2">
							{QUESTION_LINES.map((className) => (
								<div key={className} className={`${className} rounded-full`} />
							))}
						</div>
						<div className="flex gap-2 pt-2">
							{ANSWER_PILLS.map((className) => (
								<div
									key={className}
									className={`flex-1 rounded-lg ${className}`}
								/>
							))}
						</div>
					</div>
					<div className="absolute inset-x-4 bottom-3 h-1.5 overflow-hidden rounded-full bg-muted">
						<motion.div
							className="h-full rounded-full bg-primary"
							animate={{ width: ["0%", "35%", "0%"] }}
							transition={DECOR_ANIMATION}
						/>
					</div>
				</div>
			</div>

			<motion.div
				className="absolute right-8 top-4 size-4 rounded-full bg-accent"
				animate={{ y: [0, -4, 0] }}
				transition={{ ...DECOR_ANIMATION, delay: 1 }}
			/>
			<motion.div
				className="absolute bottom-8 left-4 size-3 rotate-12 rounded-lg bg-secondary"
				animate={{ y: [0, -4, 0] }}
				transition={{ ...DECOR_ANIMATION, delay: 1.8 }}
			/>
		</div>
	);
}

function QuestionGlyph() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
			<circle cx="8" cy="8" r="6" stroke="#f28c28" strokeWidth="1.5" />
			<path
				d="M8 5V9"
				stroke="#f28c28"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
			<circle cx="8" cy="11.5" r="0.75" fill="#f28c28" />
		</svg>
	);
}
