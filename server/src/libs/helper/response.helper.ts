import type { ApiResponse, ResponseWithData } from "shared";

export const success = (message = "OK"): ApiResponse => ({
	message,
	success: true,
});

export const successWithData = <T>(
	message = "OK",
	data: T
): ResponseWithData<T> => ({
	message,
	success: true,
	data,
});

export const failure = (message = "Error"): ApiResponse => ({
	message,
	success: false,
});
