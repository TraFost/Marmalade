import { Button } from "@/shared/components/atoms/button";
import { Card } from "@/shared/components/atoms/card";
import { Input } from "@/shared/components/atoms/input";

export default function HomePage() {
	return (
		<div className="min-h-screen flex items-center justify-center">
			<Card className="p-6 space-y-4">
				<h1 className="text-2xl font-semibold tracking-tight">
					Marmalade UI Shell
				</h1>
				<Input placeholder="Type something..." />
				<Button>Primary</Button>
			</Card>
		</div>
	);
}
