import { env } from "./env.config";

export const corsConfig = {
	origin: [env.FRONTEND_URL],
	allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"],
	exposeHeaders: ["Content-Length"],
	credentials: true,
};
