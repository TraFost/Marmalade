import { Button } from "@/shared/components/atoms/button";
import { useNavigate } from "react-router";

export function CallToActionSection() {
	const navigate = useNavigate();

	const handleBeginSession = () => {
		navigate("/login");
	};

	return (
		<section id="cta" className="px-6 py-32">
			<div className="mx-auto max-w-4xl text-center">
				<h2 className="mb-6 text-5xl font-serif text-foreground md:text-6xl">
					Start your first conversation: instant streaming, private, and
					reliable.
				</h2>
				<p className="mb-10 text-lg text-foreground/70">
					Begin a session now, with instant streaming voice, private storage,
					and reliable delivery.
				</p>
				<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Button
						variant="primary"
						className="w-full px-10 py-4 text-lg font-semibold tracking-tight transition-transform duration-300 hover:-translate-y-1 sm:w-auto"
						onClick={handleBeginSession}
					>
						Begin Session
					</Button>
				</div>
			</div>
		</section>
	);
}
