import { MicrophoneIcon, PlayCircleIcon } from "@phosphor-icons/react";

import { Button } from "@/shared/components/atoms/button";

export function HeroSection() {
	return (
		<section className="flex min-h-dvh items-center justify-center overflow-hidden px-6">
			<div className="mx-auto flex max-w-4xl flex-col items-center text-center">
				<p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
					Voice-first Companion
				</p>
				<h1 className="mb-6 text-3xl font-medium leading-tight tracking-tight text-foreground md:text-5xl">
					Talking is hard.
					<br />
					<span className="font-serif italic text-primary">
						Feeling alone is harder.
					</span>
				</h1>
				<div className="my-6 h-px w-16 bg-primary/30" />
				<p className="mx-auto max-w-2xl text-lg font-light leading-relaxed text-foreground/70">
					Marmalade listens like the friend who never forgets what you shared.
					Every pause, sigh, and half-finished sentence is treated with care, so
					you can exhale without explaining yourself twice.
				</p>

				<div className="flex w-full flex-col items-center gap-4 pt-6 sm:w-auto sm:flex-row">
					<Button
						variant="primary"
						className="w-full rounded-full px-8 py-4 text-base font-semibold tracking-tight transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto"
					>
						<MicrophoneIcon size={24} weight="duotone" />
						Start Session
					</Button>
					<Button
						variant="secondary"
						className="w-full rounded-full px-8 py-4 text-base font-medium tracking-tight transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto"
					>
						<PlayCircleIcon size={24} weight="duotone" />
						How It Works
					</Button>
				</div>
			</div>
		</section>
	);
}
