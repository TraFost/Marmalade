// import { env } from "./env.config";

export const corsConfig = {
	origin: ["http://localhost:5173"],
	allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
	exposeHeaders: ["Content-Length"],
	credentials: true,
};
