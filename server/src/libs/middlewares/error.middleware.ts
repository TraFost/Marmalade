import { type ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../logger";

const errorHandler: ErrorHandler = (err, c) => {
	logger.error(
		{ method: c.req.method, url: c.req.url, err },
		"Error on request"
	);
	if (err instanceof HTTPException) {
		return err.getResponse();
	}

	return new Response("Internal Error", {
		status: 500,
		statusText: err?.message || "Internal Error",
	});
};

export default errorHandler;
