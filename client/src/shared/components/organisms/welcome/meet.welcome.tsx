import { motion } from "motion/react";

const FLOATING_SHAPES = [
	{ className: "top-8 left-4 size-6 rounded-full bg-accent opacity-60" },
	{ className: "top-16 right-8 size-4 rounded-full bg-secondary opacity-70" },
	{
		className:
			"bottom-24 left-8 size-5 rounded-lg bg-muted opacity-80 rotate-12",
	},
	{ className: "bottom-32 right-4 size-3 rounded-full bg-accent" },
	{ className: "top-24 left-16 size-4 rounded-lg bg-secondary/50 rotate-45" },
] as const;

const FLOAT_TRANSITION = {
	duration: 8,
	ease: "easeInOut" as const,
	repeat: Infinity,
};

const BREATHING_TRANSITION = {
	duration: 6,
	ease: "easeInOut" as const,
	repeat: Infinity,
};

const LID_TRANSITION = {
	duration: 2,
	ease: "easeInOut" as const,
	repeat: Infinity,
};

const BLINK_TRANSITION = {
	duration: 4,
	ease: "easeInOut" as const,
	repeat: Infinity,
	times: [0, 0.9, 0.95, 1, 1],
};

export function MeetMarmaladeIllustration() {
	return (
		<div className="relative mx-auto aspect-square w-full max-w-[280px]">
			<div className="absolute inset-0 overflow-hidden">
				{FLOATING_SHAPES.map((shape, index) => (
					<motion.div
						key={shape.className}
						className={`absolute ${shape.className}`}
						animate={{
							y: [0, -8, 0],
							rotate: [0, 3, 0],
							opacity: [0.6, 1, 0.6],
						}}
						transition={{ ...FLOAT_TRANSITION, delay: index * 0.6 }}
					/>
				))}
			</div>

			<motion.svg
				viewBox="0 0 200 200"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				className="size-full"
				aria-label="Marmalade character - a friendly jar with a calm face"
				animate={{ scale: [1, 1.02, 1] }}
				transition={BREATHING_TRANSITION}
			>
				<ellipse
					cx="100"
					cy="175"
					rx="50"
					ry="8"
					fill="#2a2a2a"
					opacity="0.1"
				/>
				<path
					d="M50 70C48 65 52 60 100 60C148 60 152 65 150 70V150C152 158 145 168 100 168C55 168 48 158 50 150V70Z"
					fill="#f28c28"
					stroke="#2a2a2a"
					strokeWidth="2.5"
					strokeLinejoin="round"
				/>
				<path
					d="M60 80C58 78 62 72 80 72C90 72 92 75 90 80V130C92 135 88 140 80 140C68 140 58 138 60 130V80Z"
					fill="#ffd7a0"
					opacity="0.4"
				/>
				<rect
					x="55"
					y="48"
					width="90"
					height="16"
					rx="4"
					fill="#ffd7a0"
					stroke="#2a2a2a"
					strokeWidth="2.5"
				/>
				<motion.g
					style={{ transformOrigin: "100px 40px" }}
					animate={{ rotate: [0, 10, -5, 0] }}
					transition={LID_TRANSITION}
				>
					<rect
						x="60"
						y="38"
						width="80"
						height="12"
						rx="3"
						fill="#ffecb3"
						stroke="#2a2a2a"
						strokeWidth="2"
					/>
					<path
						d="M75 42H85M95 42H105M115 42H125"
						stroke="#2a2a2a"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
				</motion.g>
				<motion.g
					style={{ transformOrigin: "100px 105px" }}
					animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
					transition={BLINK_TRANSITION}
				>
					<path
						d="M78 105C82 100 92 100 96 105"
						stroke="#2a2a2a"
						strokeWidth="3"
						strokeLinecap="round"
						fill="none"
					/>
					<path
						d="M104 105C108 100 118 100 122 105"
						stroke="#2a2a2a"
						strokeWidth="3"
						strokeLinecap="round"
						fill="none"
					/>
				</motion.g>
				<path
					d="M85 125C90 132 110 132 115 125"
					stroke="#2a2a2a"
					strokeWidth="2.5"
					strokeLinecap="round"
					fill="none"
				/>
				<ellipse cx="72" cy="118" rx="6" ry="4" fill="#ffd7a0" opacity="0.6" />
				<ellipse cx="128" cy="118" rx="6" ry="4" fill="#ffd7a0" opacity="0.6" />
			</motion.svg>
		</div>
	);
}
