import { GoogleLogoIcon } from "@phosphor-icons/react";

import { Button } from "@/shared/components/atoms/button";
import { BackButton } from "@/shared/components/atoms/back-button";

interface Props {
	onSignIn: () => void;
}

export function LoginForm({ onSignIn }: Props) {
	return (
		<section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
			<div className="absolute top-6 left-6">
				<BackButton onHandleBack={() => window.history.back()} />
			</div>

			<form action="" className="max-w-92 m-auto h-fit w-full">
				<div className="p-6">
					<div className="text-center">
						<h1 className="mb-1 mt-4 text-xl font-semibold">
							Sign In to Marmalade
						</h1>
						<p className="text-sm text-zinc-600 dark:text-zinc-400">
							Welcome back! Sign in to continue
						</p>
					</div>

					<div className="mt-6">
						<Button
							type="button"
							variant="outline"
							className="w-full"
							onClick={onSignIn}
						>
							<span className="">Sign in with </span>
							<GoogleLogoIcon
								className="inline-block align-middle"
								size={64}
								weight="bold"
								color="#000000"
							/>
						</Button>
					</div>
				</div>
			</form>
		</section>
	);
}
