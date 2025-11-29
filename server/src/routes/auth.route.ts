import { Hono } from "hono";

import { AuthService } from "../services/auth.service";
import {
	authMiddleware,
	type AuthContext,
} from "../libs/middlewares/auth.middleware";

const app = new Hono<{ Variables: AuthContext }>();

app.use("/profile", authMiddleware);

app.get("/profile", async (c) => {
	const user = c.get("user");

	if (!user) {
		return c.json({ success: false, message: "Unauthorized" }, 401);
	}

	const authService = new AuthService();

	try {
		const profile = await authService.getUserProfile(user.id);
		return c.json({ success: true, data: profile });
	} catch {
		return c.json({ success: false, message: "Failed to get profile" }, 500);
	}
});

app.put("/profile", async (c) => {
	const user = c.get("user");

	if (!user) {
		return c.json({ success: false, message: "Unauthorized" }, 401);
	}

	const updates = await c.req.json();
	const authService = new AuthService();

	try {
		const updated = await authService.updateUserProfile(user.id, updates);
		return c.json({ success: true, data: updated });
	} catch {
		return c.json({ success: false, message: "Failed to update profile" }, 500);
	}
});

export default app;
