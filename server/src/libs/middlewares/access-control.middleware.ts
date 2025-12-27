import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import { env } from "../../configs/env.config";

const parseOrigins = (s?: string) =>
	(s || "")
		.split(",")
		.map((x) => x.trim())
		.filter(Boolean);

const allowed = parseOrigins(
	`${env.FRONTEND_URL}, http://localhost:5173, https://api.elevenlabs.io`
);
if (allowed.length === 0) {
	allowed.push(env.FRONTEND_URL);
	allowed.push(env.FRONTEND_URL.replace("localhost", "127.0.0.1"));
	allowed.push("https://api.elevenlabs.io");
}

export const accessControlMiddleware: MiddlewareHandler = createMiddleware(
	async (c, next) => {
		const origin = (
			c.req.header("Origin") ||
			c.req.header("origin") ||
			""
		).trim();
		const allowedOrigin =
			origin && allowed.includes(origin) ? origin : undefined;

		if (allowedOrigin) {
			c.res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
			c.res.headers.set("Vary", "Origin");
		}

		c.res.headers.set("Access-Control-Allow-Credentials", "true");
		c.res.headers.set(
			"Access-Control-Allow-Headers",
			"Origin, X-Requested-With, Content-Type, Accept, Authorization"
		);
		c.res.headers.set(
			"Access-Control-Allow-Methods",
			"GET, POST, PUT, DELETE, PATCH, OPTIONS"
		);

		if (c.req.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: c.res.headers });
		}

		await next();
	}
);
