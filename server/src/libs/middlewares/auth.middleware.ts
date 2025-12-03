import { createMiddleware } from "hono/factory";
import { auth, type AuthSession } from "../../configs/auth.config";

export interface AuthContext {
	user: AuthSession["user"] | null;
	session: AuthSession["session"] | null;
}

export const authMiddleware = createMiddleware<{
	Variables: AuthContext;
}>(async (c, next) => {
	try {
		const session = await auth.api.getSession({
			headers: c.req.raw.headers,
		});

		if (!session) {
			return c.json({ message: "Unauthorized", success: false }, 401);
		}

		c.set("user", session.user);
		c.set("session", session.session);

		await next();
	} catch {
		return c.json({ message: "Unauthorized", success: false }, 401);
	}
});
