import { Hono } from "hono";

import {
	type AuthContext,
	authMiddleware,
} from "../libs/middlewares/auth.middleware";
import { zValidator } from "../libs/middlewares/zod.middleware";
import { ScreeningService } from "../services/screening.service";
import {
	stepOneSchema,
	stepTwoSchema,
	stepThreeSchema,
	stepFourSchema,
	stepFiveSchema,
} from "./validators/screenings.validator";
import { handleError } from "../libs/helper/error.helper";

const screeningsService = new ScreeningService();

const screeningsRoute = new Hono<{ Variables: AuthContext }>()
	.use("*", authMiddleware)
	.post("/", async (c) => {
		try {
			const user = c.get("user");

			const screening = await screeningsService.startScreening(user?.id!);

			return c.json(
				{
					success: true,
					data: {
						id: screening?.id,
						status: screening?.status,
						currentStep: screening?.currentStep,
					},
				},
				201
			);
		} catch (error) {
			return handleError(c, error);
		}
	})
	.put("/:id/step/1", zValidator("json", stepOneSchema), async (c) => {
		try {
			const id = c.req.param("id");
			const body = c.req.valid("json");
			const updated = await screeningsService.updateStepOne(id, body);
			return c.json({
				success: true,
				data: {
					id,
					status: updated?.status,
					currentStep: updated?.currentStep,
				},
			});
		} catch (error) {
			return handleError(c, error);
		}
	})
	.put("/:id/step/2", zValidator("json", stepTwoSchema), async (c) => {
		try {
			const id = c.req.param("id");
			const body = c.req.valid("json");
			const updated = await screeningsService.updateStepTwo(id, body);
			return c.json(
				{
					success: true,
					data: {
						id,
						status: updated?.status,
						currentStep: updated?.currentStep,
					},
				},
				200
			);
		} catch (error) {
			return handleError(c, error);
		}
	})
	.put("/:id/step/3", zValidator("json", stepThreeSchema), async (c) => {
		try {
			const id = c.req.param("id");
			const body = c.req.valid("json");
			const updated = await screeningsService.updateStepThree(id, body);
			return c.json(
				{
					success: true,
					data: {
						id,
						status: updated?.status,
						currentStep: updated?.currentStep,
					},
				},
				200
			);
		} catch (error) {
			return handleError(c, error);
		}
	})
	.put("/:id/step/4", zValidator("json", stepFourSchema), async (c) => {
		try {
			const id = c.req.param("id");
			const body = c.req.valid("json");
			const { updated, dassSummary } = await screeningsService.updateStepFour(
				id,
				body
			);
			return c.json(
				{
					success: true,
					data: {
						id,
						status: updated?.status,
						currentStep: updated?.currentStep,
						dassSummary,
					},
				},
				200
			);
		} catch (error) {
			return handleError(c, error);
		}
	})
	.put("/:id/step/5", zValidator("json", stepFiveSchema), async (c) => {
		try {
			const id = c.req.param("id");
			const body = c.req.valid("json");
			const completed = await screeningsService.completeStepFive(id, body);
			return c.json(
				{
					success: true,
					data: {
						id,
						status: completed?.status,
						riskLevel: completed?.riskLevel,
						dass: {
							depressionScore: completed?.dassDepression,
							depressionLevel: completed?.dassDepressionLevel,
							anxietyScore: completed?.dassAnxiety,
							anxietyLevel: completed?.dassAnxietyLevel,
							stressScore: completed?.dassStress,
							stressLevel: completed?.dassStressLevel,
						},
						overview: {
							gender: completed?.gender,
							ageRange: completed?.ageRange,
							sleepQuality: completed?.sleepQuality,
							happinessScore: completed?.happinessScore,
							goals: completed?.goals ?? [],
						},
					},
				},
				200
			);
		} catch (error) {
			return handleError(c, error);
		}
	})
	.get("/", async (c) => {
		try {
			const userId = c.req.query("userId");
			if (!userId) {
				return c.json(
					{ success: false, message: "userId query param required" },
					400
				);
			}

			const history = await screeningsService.listByUser(userId);
			return c.json({
				success: true,
				data: history.map((item) => ({
					id: item.id,
					startedAt: item.startedAt,
					completedAt: item.completedAt,
					riskLevel: item.riskLevel,
					depressionLevel: item.dassDepressionLevel,
					anxietyLevel: item.dassAnxietyLevel,
					stressLevel: item.dassStressLevel,
				})),
			});
		} catch (error) {
			return handleError(c, error);
		}
	})
	.get("/:id", async (c) => {
		try {
			const id = c.req.param("id");
			const screening = await screeningsService.getScreening(id);
			if (!screening) {
				return c.json({ success: false, message: "Screening not found" }, 404);
			}
			return c.json({ success: true, data: screening }, 200);
		} catch (error) {
			return handleError(c, error);
		}
	});

export default screeningsRoute;
