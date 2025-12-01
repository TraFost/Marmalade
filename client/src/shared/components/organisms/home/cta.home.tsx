import { Button } from "@/shared/components/atoms/button";

export function CallToActionSection() {
	return (
		<section className="px-6 py-32">
			<div className="mx-auto max-w-4xl text-center">
				<h2 className="mb-6 text-5xl font-serif text-foreground md:text-6xl">
					Start your first conversation.
				</h2>
				<p className="mb-10 text-lg text-foreground/70">
					Let Marmalade walk with you — one gentle step at a time.
				</p>
				<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Button className="w-full rounded-full px-8 py-4 text-lg font-medium shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:w-auto">
						Begin Session
					</Button>
					<Button
						variant="outline"
						className="w-full rounded-full border-border px-8 py-4 text-lg font-medium text-foreground transition-all duration-300 hover:bg-muted sm:w-auto"
					>
						View Demo
					</Button>
				</div>
			</div>
		</section>
	);
}
