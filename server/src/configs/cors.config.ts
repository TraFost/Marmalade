import { env } from "./env.config";

export const corsConfig = {
	origin: [env.FRONTEND_URL, "http://localhost:5173"],
	allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"],
	allowHeaders: ["Content-Type", "Authorization"],
	exposeHeaders: ["Content-Length"],
	credentials: true,
};
