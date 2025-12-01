import {
	createBrowserRouter,
	RouterProvider,
	type RouteObject,
} from "react-router";

import HomePage from "@/features/home/pages/home.page";

export interface Page {
	id: string;
	label: string;
	path: string;
	element: RouteObject["element"];
}

export const PAGES: Page[] = [
	{ id: "home", label: "Home", path: "/", element: <HomePage /> },
	//   { id: 'summarize', label: 'Summarize', path: '/summarize', element: <SummarizePage /> },
	//   { id: 'analyze', label: 'Analyze', path: '/analyze', element: <AnalyzePage /> },
	//   { id: 'team', label: 'Team', path: '/team', element: <TeamPage /> },
	{
		id: "404",
		label: "Not Found",
		path: "*",
		element: <div>404 Not Found</div>,
	},
] as const;

const createRoute = (option: RouteObject): RouteObject => ({
	id: option.id,
	path: option.path,
	element: option.element,
});

const router = createBrowserRouter([...PAGES.map((p) => createRoute(p))]);

export function AppRouter() {
	return <RouterProvider router={router} />;
}
