export class AppError extends Error {
	status: number;
	code?: string;

	constructor(message: string, status = 400, code?: string) {
		super(message);
		this.status = status;
		this.code = code;
	}
}

export function handleError(c: any, error: unknown) {
	if (error instanceof AppError) {
		return c.json(
			{
				success: false,
				message: error.message,
				code: error.code,
			},
			error.status
		);
	}

	return c.json({ success: false, message: "Unexpected error" }, 500);
}
