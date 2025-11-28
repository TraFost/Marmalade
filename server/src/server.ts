import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";

import errorHandler from "../middlewares/error.middleware";

// import type { ApiResponse } from "shared/dist";

export function createApp(): Hono {
	const api = new Hono().basePath("/api");
	// .route("/auth", authRoutes)

	const app = new Hono()
		.use(cors())
		.use(logger())
		.use(timing())
		.use(secureHeaders())
		.use(csrf())
		.use(prettyJSON())
		.onError(errorHandler)
		.notFound((c) =>
			c.json({ success: false, message: "Route not found" }, 404)
		)
		.get("/", (c) => {
			return c.text("Hello, Welcome to marmalade API!");
		});

	app.route("/api", api);

	return app;
}
