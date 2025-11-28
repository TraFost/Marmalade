import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";

import errorHandler from "./libs/middlewares/error.middleware";

export function createApp(): Hono {
	const api = new Hono().basePath("/api");

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
