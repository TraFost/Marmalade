export const corsConfig = {
	origin: ["http://localhost:5173"],
	allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"],
	exposeHeaders: ["Content-Length"],
	credentials: true,
};
