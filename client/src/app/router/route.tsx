import {
	createBrowserRouter,
	RouterProvider,
	type RouteObject,
} from "react-router";

import { PUBLIC_PAGES } from "./public.route";
import { AUTH_PAGES } from "./auth.route";
import { PRIVATE_PAGES } from "./private.route";
import { PrivateLayout } from "../layout/private.layout";
import { AuthLayout } from "../layout/auth.layout";

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
		children: PUBLIC_PAGES.map((p) => createRoute(p)),
	},
	{
		id: "auth-root",
		element: <AuthLayout />,
		children: AUTH_PAGES.map((p) => createRoute(p)),
	},
	{
		id: "private-root",
		element: <PrivateLayout />,
		children: PRIVATE_PAGES.map((p) => createRoute(p)),
	},
]);

export function AppRouter() {
	return <RouterProvider router={router} />;
}
