import {
	ArrowRightIcon,
	HandshakeIcon,
	MoonStarsIcon,
	ShieldCheckIcon,
	SparkleIcon,
} from "@phosphor-icons/react";

const HIGHLIGHTS = [
	{
		title: "Radical Acceptance",
		description:
			"Modeled after Rogers' unconditional positive regard. We don't judge your thoughts; we help you explore them.",
		icon: HandshakeIcon,
		accent: "bg-primary/15 text-primary",
	},
	{
		title: "24/7 Presence",
		description:
			"Anxiety doesn't adhere to business hours. Whether it's 3 AM insomnia or a midday spiral, Marmalade listens.",
		icon: MoonStarsIcon,
		accent: "bg-foreground/5 text-foreground",
	},
	{
		title: "Private by Design",
		description:
			"Local-first encryption keeps every whisper on your device. We never trade or monetize sensitive data.",
		icon: ShieldCheckIcon,
		accent: "bg-foreground/5 text-foreground",
	},
	{
		title: "Guided Clarity",
		description:
			"When the world feels loud, we break overwhelm into grounded prompts so you can take one breath at a time.",
		icon: SparkleIcon,
		accent: "bg-accent/30 text-primary",
	},
];

export function InspirationSection() {
	return (
		<section id="story" className="px-6 py-24 lg:py-32">
			<div className="mx-auto max-w-6xl lg:max-w-7xl">
				<div className="grid gap-12 lg:grid-cols-12 lg:items-start">
					<div className="space-y-6 lg:col-span-4 lg:sticky lg:top-24">
						<p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">
							Our Philosophy
						</p>
						<h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
							Why we built
							<br />
							<span className="text-primary/90">Marmalade.</span>
						</h2>
						<p className="text-base text-foreground/70">
							Therapy is expensive. Friends are busy. Sometimes you just need a
							space that exists solely for you to be heard—without judgment,
							waiting lists, or fees.
						</p>
						<a
							href="#"
							className="group inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
						>
							Read our manifesto
							<ArrowRightIcon
								size={16}
								className="transition-transform group-hover:translate-x-1"
							/>
						</a>
					</div>
					<div className="grid gap-6 sm:grid-cols-2 lg:col-span-8">
						{HIGHLIGHTS.map(
							({ title, description, icon: Icon, accent }, index) => (
								<div
									key={title}
									className={`group rounded-3xl border border-border/40 bg-card/95 p-8 transition-colors duration-300 hover:bg-card ${
										index === 0 ? "sm:col-span-2" : ""
									}`}
								>
									<div
										className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl ${accent} transition-transform duration-300 group-hover:scale-110`}
									>
										<Icon size={26} weight="duotone" />
									</div>
									<h3 className="mb-3 text-xl font-semibold tracking-tight text-foreground">
										{title}
									</h3>
									<p className="text-sm text-foreground/70">{description}</p>
								</div>
							)
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
