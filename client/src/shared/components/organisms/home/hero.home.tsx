import { Microphone, PlayCircle } from "@phosphor-icons/react";

import { Button } from "@/shared/components/atoms/button";

export function HeroSection() {
	return (
		<header className="relative px-6 pb-20 pt-32 md:pb-32 md:pt-48">
			<div className="mx-auto max-w-4xl text-center">
				<h1 className="mb-6 text-4xl font-medium leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
					Someone to talk to — <br className="hidden md:block" />
					<span className="font-serif italic text-foreground/70">
						even when you don’t know where to start.
					</span>
				</h1>
				<p className="mx-auto mb-10 max-w-2xl text-lg font-light leading-relaxed text-foreground/70 md:text-xl">
					Marmalade is a voice-based mental-health companion that listens,
					remembers, and gently helps you understand what you’re feeling.
				</p>
				<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Button className="w-full rounded-full px-8 py-4 text-base font-medium shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:w-auto">
						<Microphone size={20} weight="duotone" className="mr-2" />
						Start Your First Session
					</Button>
					<Button
						variant="outline"
						className="w-full rounded-full border-border px-8 py-4 text-base text-foreground transition-all duration-300 hover:bg-muted sm:w-auto"
					>
						<PlayCircle size={20} weight="duotone" className="mr-2" />
						See How It Works
					</Button>
				</div>
			</div>
		</header>
	);
}
