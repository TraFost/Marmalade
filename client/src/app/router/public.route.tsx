import { HomePage } from "@/features/home/pages/home.page";
import { Page } from "./route";

export const PUBLIC_PAGES: Page[] = [
	{
		id: "home",
		label: "Home",
		path: "/",
		element: <HomePage />,
	},
	{
		id: "404",
		label: "Not Found",
		path: "*",
		element: <div>404 Not Found</div>,
	},
] as const;
