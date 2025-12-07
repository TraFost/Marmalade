import { motion } from "motion/react";

const PHONE_DIMENSIONS = { width: 160, height: 240 } as const;
const WAVE_LENGTH = 76;
const WAVE_POINTS = Array.from(
	{ length: WAVE_LENGTH },
	(_, index) => index * 2
);
const SOUND_DOTS = [0, 1, 2] as const;
const SOUND_WAVES = [0, 1, 2] as const;

const WAVE_ANIMATION = {
	duration: 5,
	ease: "easeInOut" as const,
	repeat: Infinity,
};

const DOT_ANIMATION = {
	duration: 3,
	ease: "linear" as const,
	repeat: Infinity,
};

const PULSE_ANIMATION = {
	duration: 2,
	ease: "easeInOut" as const,
	repeat: Infinity,
};

const FLOAT_ANIMATION = {
	duration: 4,
	ease: "easeInOut" as const,
	repeat: Infinity,
};

const WAVE_PHASES = [0, 30, 60] as const;

export function VoiceIllustration() {
	return (
		<div className="relative mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center">
			<div
				className="relative overflow-hidden rounded-3xl border-2 border-foreground/10 bg-card shadow-lg"
				style={{
					width: PHONE_DIMENSIONS.width,
					height: PHONE_DIMENSIONS.height,
				}}
			>
				<div className="absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-full bg-foreground/10" />
				<div className="absolute inset-4 top-8 flex flex-col items-center">
					<SpeechBubble />
					<Waveform />
					<MiniControls />
				</div>
				<div className="absolute bottom-2 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-foreground/20" />
			</div>
			<SideWaves />
			<FloatingAccent
				className="absolute left-4 top-8 size-5 rotate-12 rounded-lg bg-accent/60"
				delay={0.5}
			/>
			<FloatingAccent
				className="absolute bottom-12 right-4 size-4 rounded-full bg-secondary"
				delay={1.5}
			/>
		</div>
	);
}

function SpeechBubble() {
	return (
		<div className="relative mb-4 w-full rounded-xl bg-muted p-3">
			<div className="space-y-1.5">
				<div className="h-2 w-full rounded-full bg-foreground/20" />
				<div className="h-2 w-4/5 rounded-full bg-foreground/15" />
				<div className="h-2 w-3/5 rounded-full bg-foreground/10" />
			</div>
			<div className="absolute -bottom-2 left-6 h-4 w-4 rotate-45 bg-muted" />
		</div>
	);
}

function Waveform() {
	return (
		<div className="flex h-12 w-full items-center justify-center">
			<svg
				width="150"
				height="40"
				viewBox="0 0 150 40"
				className="overflow-visible"
			>
				<motion.path
					d={`M0 20 ${WAVE_POINTS.map((x) => `L${x} 20`).join(" ")}`}
					fill="none"
					stroke="#f28c28"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					animate={{ d: WAVE_PHASES.map((phase) => buildWavePath(phase)) }}
					transition={WAVE_ANIMATION}
				/>
				{SOUND_DOTS.map((dot) => (
					<motion.circle
						key={`sound-dot-${dot}`}
						r="3"
						fill="#f28c28"
						animate={{
							cx: [0, 150],
							cy: [20, 20],
							opacity: [0.6 - dot * 0.15, 0.6 - dot * 0.15, 0],
						}}
						transition={{ ...DOT_ANIMATION, delay: dot * 0.8 }}
					/>
				))}
			</svg>
		</div>
	);
}

function MiniControls() {
	return (
		<div className="mt-4 flex items-center gap-3">
			<motion.div
				className="flex size-10 items-center justify-center rounded-full bg-primary"
				animate={{ scale: [1, 1.05, 1] }}
				transition={PULSE_ANIMATION}
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
					<path
						d="M8 2V10M8 10L5 7M8 10L11 7"
						stroke="white"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						transform="rotate(180 8 8)"
					/>
					<path
						d="M3 12H13"
						stroke="white"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
				</svg>
			</motion.div>
		</div>
	);
}

function SideWaves() {
	return (
		<div className="absolute -right-2 top-1/2 -translate-y-1/2 space-y-2">
			{SOUND_WAVES.map((wave) => (
				<motion.div
					key={`wave-${wave}`}
					className="h-0.5 w-4 rounded-full bg-primary"
					animate={{ opacity: [0.3, 1, 0.3], scaleX: [1, 1.2, 1] }}
					transition={{ ...PULSE_ANIMATION, delay: wave * 0.3 }}
					style={{ opacity: 1 - wave * 0.25 }}
				/>
			))}
		</div>
	);
}

function FloatingAccent({
	className,
	delay,
}: {
	className: string;
	delay: number;
}) {
	return (
		<motion.div
			className={className}
			animate={{ y: [0, -4, 0] }}
			transition={{ ...FLOAT_ANIMATION, delay }}
		/>
	);
}

function buildWavePath(phase: number) {
	return `M0 20 ${WAVE_POINTS.map((x) => {
		const base = 20;
		const primary = Math.sin((x + phase) * 0.05) * 6;
		const secondary = Math.sin((x + phase * 0.8) * 0.08) * 3;
		return `L${x} ${base + primary + secondary}`;
	}).join(" ")}`;
}
