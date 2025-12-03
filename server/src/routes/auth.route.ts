import { Hono } from "hono";

import { AuthService } from "../services/auth.service";
import {
	authMiddleware,
	type AuthContext,
} from "../libs/middlewares/auth.middleware";
import { zValidator } from "../libs/middlewares/zod.middleware";
import { handleError, AppError } from "../libs/helper/error.helper";
import { updateProfileSchema } from "./validators/auth.validator";
import { successWithData } from "../libs/helper/response.helper";

const authService = new AuthService();

const authRoute = new Hono<{ Variables: AuthContext }>()
	.use("*", authMiddleware)
	.get("/profile", async (c) => {
		try {
			const user = c.get("user");
			if (!user) {
				throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
			}

			const profile = await authService.getUserProfile(user.id);
			if (!profile) {
				throw new AppError("User not found", 404, "USER_NOT_FOUND");
			}

			return c.json(
				successWithData("Profile fetched successfully", profile),
				200
			);
		} catch (error) {
			return handleError(c, error);
		}
	})
	.put("/profile", zValidator("json", updateProfileSchema), async (c) => {
		try {
			const user = c.get("user");
			if (!user) {
				throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
			}

			const updates = c.req.valid("json");
			const updated = await authService.updateUserProfile(user.id, updates);
			if (!updated) {
				throw new AppError("User not found", 404, "USER_NOT_FOUND");
			}

			return c.json(
				successWithData("Profile updated successfully", updated),
				200
			);
		} catch (error) {
			return handleError(c, error);
		}
	});

export default authRoute;
