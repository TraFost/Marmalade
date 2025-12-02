import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";
import {
	ClipboardText,
	Heartbeat,
	Microphone,
	ShieldCheck,
	Sparkle,
} from "@phosphor-icons/react";

import { cn } from "@/shared/lib/helper/classname";

interface FeatureHighlight {
	title: string;
	description: string;
	icon: ComponentType<IconProps>;
}

const featureHighlights: FeatureHighlight[] = [
	{
		title: "Voice Conversations",
		description:
			"Talk naturally. Marmalade responds with warmth and clarity, understanding nuances in tone, pace, and silence.",
		icon: Microphone,
	},
	{
		title: "Emotional Baseline",
		description:
			"Integrates DASS-21 screening to understand where you are starting from.",
		icon: ClipboardText,
	},
	{
		title: "Contextual Memory",
		description:
			"Keeps track of your mood patterns so every session feels continuous.",
		icon: Heartbeat,
	},
	{
		title: "Private & Secure",
		description:
			"Local-first encryption ensures your thoughts remain yours alone.",
		icon: ShieldCheck,
	},
	{
		title: "Personalized Guidance",
		description:
			"Responses adapt to your emotional history. If you're anxious, it slows down. If you're sad, it offers presence.",
		icon: Sparkle,
	},
];

interface FeatureSectionProps {
	className?: string;
}

export function FeatureSection({ className }: FeatureSectionProps) {
	return (
		<section className={cn("relative mx-auto max-w-6xl px-6 py-24", className)}>
			<div className="grid gap-16 lg:grid-cols-[1fr_1.1fr] lg:items-center">
				<div className="order-2 lg:order-1">
					<div className="relative aspect-4/5 overflow-hidden rounded-4xl border border-border/40 bg-card">
						<img
							src="https://images.unsplash.com/photo-1516302752625-fcc3c50ae61f?q=80&w=2940&auto=format&fit=crop"
							alt="Calm reflection"
							className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
						/>
						<div className="absolute inset-0 bg-linear-to-b from-background/10 via-background/40 to-background/80" />
						<div className="absolute right-6 top-6 rounded-xl border border-border/50 bg-background/80 px-4 py-3 text-left text-xs uppercase tracking-widest text-foreground/70 backdrop-blur">
							<p className="mb-2 text-[10px] font-semibold tracking-[0.3em] text-primary">
								Sentiment Analysis
							</p>
							<div className="flex h-6 items-end gap-1">
								<span className="h-3 w-1 rounded-sm bg-primary/30" />
								<span className="h-6 w-1 rounded-sm bg-primary" />
								<span className="h-4 w-1 rounded-sm bg-primary/70" />
								<span className="h-2 w-1 rounded-sm bg-primary/40" />
							</div>
						</div>
						<div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-border/40 bg-card/90 p-6 shadow-lg shadow-primary/10 backdrop-blur">
							<h3 className="text-lg font-semibold text-foreground">
								Contextual Memory
							</h3>
							<p className="text-sm text-foreground/70">
								Remembers that you were anxious about work last week, so you
								never have to start from zero.
							</p>
						</div>
					</div>
				</div>
				<div className="order-1 lg:order-2">
					<p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
						Features
					</p>
					<h2 className="mb-8 text-3xl font-medium leading-tight tracking-tight text-foreground md:text-4xl">
						More than a tool.
						<br />
						<span className="font-serif italic text-primary">A companion.</span>
					</h2>
					<div className="my-6 h-px w-16 bg-primary/30" />
					<p className="text-lg font-light leading-relaxed text-foreground/70">
						Marmalade adapts to your emotional history. If you are anxious, it
						slows down. If you are sad, it offers presence. Nothing about the
						conversation feels generic.
					</p>
					<p className="mt-4 text-base text-foreground">
						Each capability below was shaped by real late-night calls for help.
						We built the product we wished we had.
					</p>
					<div className="my-8 h-px w-12 bg-border/60" />
					<div className="space-y-6">
						{featureHighlights.map(
							({ title, description, icon: Icon }, index) => (
								<div
									key={title}
									className="group border-b border-border/40 pb-6 transition-colors last:border-b-0"
								>
									<div className="mb-3 flex items-center justify-between gap-4">
										<div className="flex items-baseline gap-2">
											<span className="text-md font-semibold uppercase tracking-[0.3em] text-primary/70">
												{String(index + 1).padStart(2, "0")}.
											</span>
											<h3 className="text-xl font-medium text-foreground transition-colors group-hover:text-primary">
												{title}
											</h3>
										</div>
										<Icon
											size={26}
											weight="duotone"
											className="text-foreground/60 transition-colors group-hover:text-primary"
										/>
									</div>
									<p className="text-sm leading-relaxed text-foreground/70">
										{description}
									</p>
								</div>
							)
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
