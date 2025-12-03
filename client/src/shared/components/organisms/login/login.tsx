import { LogoIcon } from "@/shared/components/atoms/logo";
import { Button } from "@/shared/components/atoms/button";

import { Link } from "react-router";

interface Props {
	onSignIn: () => void;
}

export default function LoginPage({ onSignIn }: Props) {
	return (
		<section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
			<form action="" className="max-w-92 m-auto h-fit w-full">
				<div className="p-6">
					<div>
						<Link to="/" aria-label="go home">
							<LogoIcon />
						</Link>
						<h1 className="mb-1 mt-4 text-xl font-semibold">
							Sign In to Marmalade
						</h1>
						<p>Welcome back! Sign in to continue</p>
					</div>

					<div className="mt-6">
						<Button
							type="button"
							variant="outline"
							className="w-full"
							onClick={onSignIn}
						>
							<span>Google</span>
						</Button>
					</div>
				</div>
			</form>
		</section>
	);
}
