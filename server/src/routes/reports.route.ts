import { Hono } from "hono";

import {
	type AuthContext,
	authMiddleware,
} from "../libs/middlewares/auth.middleware";
import { zValidator } from "../libs/middlewares/zod.middleware";
import { handleError } from "../libs/helper/error.helper";
import { successWithData } from "../libs/helper/response.helper";
import { generateSessionReportSchema } from "./validators/reports.validator";
import { ReportService } from "../services/report.service";
import type {
	GenerateSessionReportRequest,
	GenerateSessionReportResponse,
} from "shared";

const reportService = new ReportService();

const reportsRoute = new Hono<{ Variables: AuthContext }>()
	.use("*", authMiddleware)
	.post(
		"/session",
		zValidator("json", generateSessionReportSchema),
		async (c) => {
			try {
				const user = c.get("user");
				const body = c.req.valid("json") as GenerateSessionReportRequest;

				const res = await reportService.generateSessionReport({
					userId: user!.id,
					sessionId: body.sessionId,
					messageLimit: body.messageLimit,
				});

				return c.json(
					successWithData<GenerateSessionReportResponse>(
						"Report generated",
						res
					),
					200
				);
			} catch (error) {
				return handleError(c, error);
			}
		}
	);

export default reportsRoute;
