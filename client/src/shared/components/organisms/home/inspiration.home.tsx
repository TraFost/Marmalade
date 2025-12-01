import { Cat } from "@phosphor-icons/react";

export function InspirationSection() {
	return (
		<section className="px-6 py-24">
			<div className="mx-auto flex max-w-4xl flex-col gap-12 rounded-[2.5rem] bg-foreground p-8 text-primary-foreground md:flex-row md:p-16">
				<div className="relative z-10 flex-1">
					<span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-primary">
						Our Inspiration
					</span>
					<h2 className="mb-6 text-3xl font-serif md:text-4xl">Why a cat?</h2>
					<div className="space-y-4 text-lg font-light text-primary-foreground/80">
						<p>Cats don’t judge.</p>
						<p>They sit with you quietly.</p>
						<p>They show up without demanding anything.</p>
						<p className="mt-6 border-t border-white/20 pt-6 text-sm text-primary-foreground/70">
							Marmalade’s mascot is inspired by an orange cat named Dila — a
							reminder that comfort can be simple and soft.
						</p>
					</div>
				</div>
				<div className="relative flex h-48 w-48 shrink-0 items-center justify-center rounded-full border border-primary-foreground/30 bg-primary-foreground/10 md:h-64 md:w-64">
					<Cat size={160} weight="duotone" className="text-primary" />
				</div>
			</div>
		</section>
	);
}
