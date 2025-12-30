import {
	HandshakeIcon,
	MoonStarsIcon,
	SparkleIcon,
	Microphone,
	ClipboardText,
} from "@phosphor-icons/react";

const HIGHLIGHTS = [
	{
		title: "Real-time Streaming",
		description:
			"Instant, streaming voice replies so conversations flow naturally and you hear a steady, human voice.",
		icon: Microphone,
		accent: "bg-primary/15 text-primary",
	},
	{
		title: "Safety-first",
		description:
			"Lightweight safety scans (MiniBrain) detect risk early and prioritize safety-first responses.",
		icon: ClipboardText,
		accent: "bg-foreground/5 text-foreground",
	},
	{
		title: "Persistent Context",
		description:
			"Memory that keeps important context across sessions so you never have to repeat yourself.",
		icon: HandshakeIcon,
		accent: "bg-foreground/5 text-foreground",
	},
	{
		title: "Always-on Presence",
		description:
			"A companion available around the clock for check-ins and steady presence.",
		icon: MoonStarsIcon,
		accent: "bg-accent/30 text-primary",
	},
	{
		title: "AI Report (SOAP)",
		description:
			"Generate a structured session summary (SOAP) highlighting themes, risks, and suggested next steps.",
		icon: SparkleIcon,
		accent: "bg-foreground/5 text-foreground",
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
							Why i built
							<br />
							<span className="text-primary/90">Marmalade.</span>
						</h2>
						<p className="text-base text-foreground/70">
							Accessible, affordable, and always on, Marmalade provides a
							private space that exists solely for you to be heard without
							judgment, waiting lists, or fees.
						</p>

						<div className="mt-6 rounded-2xl border border-border/40 bg-card/95 p-6 text-sm text-foreground/70">
							<h4 className="mb-3 font-semibold text-foreground">
								Under the hood
							</h4>
							<ul className="space-y-2 list-inside">
								<li>
									<strong>Fast safety checks:</strong> a lightweight classifier
									scans each turn and can gate deeper replies for safety.
								</li>
								<li>
									<strong>Deterministic coordination:</strong> small,
									explainable rules shape tone, grounding, and interventions.
								</li>
								<li>
									<strong>Streaming-first replies:</strong> short
									acknowledgements start immediately while fuller replies stream
									in.
								</li>
								<li>
									<strong>Reliable delivery:</strong> idempotent background
									saves reduce the chance of dropped messages on server
									restarts.
								</li>
								<li>
									<strong>AI Report (SOAP):</strong> generate a structured
									session summary capturing themes, risk, and suggested next
									steps.
								</li>
							</ul>
						</div>
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
