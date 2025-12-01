import {
	createBrowserRouter,
	Outlet,
	RouterProvider,
	type RouteObject,
} from "react-router";

import { PUBLIC_PAGES } from "./public.route";
import { PublicLayout } from "@/shared/components/organisms/layout/public-layout";

export interface Page {
	id: string;
	label: string;
	path: string;
	element: RouteObject["element"];
}

const createRoute = (option: RouteObject): RouteObject => ({
	id: option.id,
	path: option.path,
	element: option.element,
});

const router = createBrowserRouter([
	{
		id: "public-root",
		element: <PublicLayoutRoute />,
		children: PUBLIC_PAGES.map((p) => createRoute(p)),
	},
]);

function PublicLayoutRoute() {
	return (
		<PublicLayout>
			<Outlet />
		</PublicLayout>
	);
}

export function AppRouter() {
	return <RouterProvider router={router} />;
}
