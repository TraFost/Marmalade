export function AboutSection() {
	return (
		<section
			id="about"
			className="border-y border-border/40 bg-card px-6 py-24"
		>
			<div className="mx-auto max-w-3xl">
				<h2 className="mb-10 text-3xl font-medium leading-tight tracking-tight text-foreground md:text-4xl">
					Talking is hard. <br />
					<span className="font-serif italic text-primary">
						Feeling alone is harder.
					</span>
				</h2>
				<div className="space-y-6 text-lg font-light leading-relaxed text-foreground/70">
					<p>
						Some people want to talk but don’t know how to begin. Some feel too
						shy, too overwhelmed, or too tired to reach out to a professional or
						a friend.
					</p>
					<p className="font-medium text-foreground">
						Marmalade bridges that gap — a quiet, steady companion that meets
						you where you are.
					</p>
					<div className="my-8 h-px w-16 bg-primary/30" />
					<p className="text-base italic text-foreground/70">
						This project was created by someone who navigated years of stress
						alone. If Marmalade can make even one person feel less isolated,
						it’s worth building.
					</p>
				</div>
			</div>
		</section>
	);
}
