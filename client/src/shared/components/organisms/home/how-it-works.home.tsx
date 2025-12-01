const howItWorksSteps = [
	{
		title: "Check-in",
		description:
			"Take a DASS-21 screening to help Marmalade understand your emotional baseline.",
	},
	{
		title: "Talk",
		description:
			"Speak freely. Marmalade listens and responds with care, analyzing tone and sentiment.",
	},
	{
		title: "Remember",
		description:
			"Each session updates your emotional profile so conversations feel more personal over time.",
	},
	{
		title: "Grow",
		description:
			"View your mood trends and emotional progress in a clean, private dashboard.",
	},
];

export function HowItWorksSection() {
	return (
		<section
			id="how-it-works"
			className="border-t border-border/40 bg-card px-6 py-24"
		>
			<div className="mx-auto max-w-6xl">
				<div className="mb-16 text-center">
					<h2 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">
						Simple. Safe. Human-centered.
					</h2>
				</div>
				<div className="relative grid gap-8 md:grid-cols-4">
					<div className="absolute left-0 top-12 hidden h-px w-full bg-linear-to-r from-transparent via-primary/30 to-transparent md:block" />
					{howItWorksSteps.map((step, index) => (
						<div key={step.title} className="relative z-10 text-center">
							<div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-background text-primary shadow-sm transition-transform duration-300 hover:scale-105">
								<span className="font-serif text-2xl">{index + 1}</span>
							</div>
							<h3 className="mb-2 text-base font-semibold text-foreground">
								{step.title}
							</h3>
							<p className="px-4 text-xs leading-relaxed text-foreground/70">
								{step.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
