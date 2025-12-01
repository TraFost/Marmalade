import { Outlet } from "react-router";
import { AppProviders } from "@/app/providers/main.provider";

export function App() {
	return (
		<>
			<AppProviders>
				<Outlet />
			</AppProviders>
		</>
	);
}
