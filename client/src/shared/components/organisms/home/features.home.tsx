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

interface FeatureCard {
	title: string;
	description: string;
	icon: ComponentType<IconProps>;
	className?: string;
}

const featureCards: FeatureCard[] = [
	{
		title: "Voice Conversations",
		description:
			"Talk naturally. Marmalade responds with warmth and clarity, understanding nuances in tone and pace.",
		icon: Microphone,
	},
	{
		title: "Remembers Emotional State",
		description:
			"It keeps track of your sessions, mood patterns, and what you’re struggling with so you don't have to repeat yourself.",
		icon: Heartbeat,
	},
	{
		title: "DASS-21 Screening",
		description:
			"Your first session includes a gentle emotional check-in so future conversations are grounded in real context.",
		icon: ClipboardText,
	},
	{
		title: "Personalized Guidance",
		description:
			"Every reply adapts to your emotional history — no generic AI responses. If you are anxious, it slows down. If you are sad, it offers presence.",
		icon: Sparkle,
		className: "lg:col-span-2",
	},
	{
		title: "Private & Secure",
		description:
			"Your conversations stay yours. Local-first encryption ensures your thoughts remain private.",
		icon: ShieldCheck,
	},
];

interface FeatureSectionProps {
	className?: string;
}

export function FeatureSection({ className }: FeatureSectionProps) {
	return (
		<section
			className={cn(
				"mx-auto grid max-w-6xl gap-6 px-6 py-24 md:grid-cols-2 lg:grid-cols-3",
				className
			)}
		>
			<div className="md:col-span-2 lg:col-span-3">
				<span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-primary">
					Features
				</span>
				<h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">
					A companion that learns you — <br className="hidden sm:block" /> not
					just your words.
				</h2>
			</div>
			{featureCards.map(
				({ title, description, icon: Icon, className: cardClassName }) => (
					<div
						key={title}
						className={cn(
							"rounded-3xl border border-border/40 bg-card p-8 shadow-sm transition-shadow duration-300 hover:shadow-md",
							cardClassName
						)}
					>
						<div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/40 text-primary">
							<Icon size={22} weight="duotone" />
						</div>
						<h3 className="mb-2 text-lg font-medium text-foreground">
							{title}
						</h3>
						<p className="text-sm leading-relaxed text-foreground/70">
							{description}
						</p>
					</div>
				)
			)}
		</section>
	);
}
