import { Hono } from "hono";
import { cors } from "hono/cors";
// import { csrf } from "hono/csrf";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";
import { pinoLogger } from "hono-pino";
import pino from "pino";

import errorHandler from "./libs/middlewares/error.middleware";
import screeningsRoute from "./routes/screenings.route";
import stateMappingRoute from "./routes/state-mapping.route";
import sessionsRoute from "./routes/sessions.route";
import messagesRoute from "./routes/messages.route";
import reportsRoute from "./routes/reports.route";
import hooksRoute from "./routes/hooks.route";

import { corsConfig } from "./configs/cors.config";
import { auth } from "./configs/auth.config";

export function createApp() {
	const api = new Hono()
		.route("/screenings", screeningsRoute)
		.route("/state-mapping", stateMappingRoute)
		.route("/sessions", sessionsRoute)
		.route("/messages", messagesRoute)
		.route("/reports", reportsRoute);

	const app = new Hono()
		.use(cors(corsConfig))
		.use(
			pinoLogger({
				pino: pino({
					base: null,
					level: "trace",
					transport: {
						target: "hono-pino/debug-log",
					},
					timestamp: pino.stdTimeFunctions.epochTime,
				}),
			})
		)
		.use(timing())
		.use(secureHeaders())
		// .use(csrf())
		.use(prettyJSON())
		.onError(errorHandler)
		.notFound((c) =>
			c.json({ success: false, message: "Route not found" }, 404)
		)
		.get("/", (c) => {
			return c.text("Hello, Welcome to marmalade API!");
		});

	app.on(
		["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		"/api/auth/*",
		(c) => {
			console.log("Better Auth route hit:", c.req.method, c.req.path);
			return auth.handler(c.req.raw);
		}
	);

	app.route("/api", api);
	app.route("/", hooksRoute);

	return app;
}
