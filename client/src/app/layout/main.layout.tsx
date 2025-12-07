import { AppProviders } from "@/app/providers/main.provider";
import { AppRouter } from "../router/route";

export function App() {
	return (
		<AppProviders>
			<AppRouter />
		</AppProviders>
	);
}
