import { useParams } from "react-router";

export function SessionPage() {
	const params = useParams();
	const sessionId = params.id;

	return (
		<section className="min-h-dvh bg-background">
			<div className="mx-auto w-full max-w-xl px-6 py-12">
				<header className="mb-6">
					<h1 className="text-2xl font-semibold text-foreground">Session</h1>
					<p className="text-sm text-muted-foreground">
						Session ID: {sessionId}
					</p>
				</header>

				<div className="rounded-lg border border-border/60 bg-card p-6">
					<p className="text-sm text-muted-foreground">
						Your session was started. This is a minimal placeholder UI for the
						Marmalade session surface.
					</p>

					{/* Future controls (mic, transcript, playback) will live here */}
				</div>
			</div>
		</section>
	);
}
