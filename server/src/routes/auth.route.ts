import { Hono } from "hono";

import type { ResponseWithData } from "shared/src/types/response.type";

import { AuthService } from "../services/auth.service";
import {
	authMiddleware,
	type AuthContext,
} from "../libs/middlewares/auth.middleware";

const app = new Hono<{ Variables: AuthContext }>()
	.use("*", authMiddleware)
	.get("/profile", async (c) => {
		const user = c.get("user");

		if (!user) {
			return c.json({ success: false, message: "Unauthorized" }, 401);
		}

		const authService = new AuthService();

		try {
			const profile = await authService.getUserProfile(user.id);
			if (!profile) {
				return c.json({ success: false, message: "User not found" }, 404);
			}
			return c.json({ success: true, data: profile });
		} catch {
			return c.json({ success: false, message: "Failed to get profile" }, 500);
		}
	})
	.put("/profile", async (c) => {
		const user = c.get("user");

		if (!user) {
			return c.json({ success: false, message: "Unauthorized" }, 401);
		}

		const updates = await c.req.json();
		const authService = new AuthService();

		try {
			const updated = await authService.updateUserProfile(user.id, updates);
			if (!updated) {
				return c.json({ success: false, message: "User not found" }, 404);
			}
			return c.json({ success: true, data: updated });
		} catch {
			return c.json(
				{ success: false, message: "Failed to update profile" },
				500
			);
		}
	});

export default app;
