import { env } from "./env.config";

const FRONTEND_URL =
	env.NODE_ENV === "development" ? "http://localhost:5173" : env.FRONTEND_URL;

export const corsConfig = {
	origin: [FRONTEND_URL],
	allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"],
	allowHeaders: ["Content-Type", "Authorization"],
	exposeHeaders: ["Content-Length"],
	credentials: true,
};
