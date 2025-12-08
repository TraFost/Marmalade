import crypto from "crypto";

export function verifyElevenLabsSignature(
	body: string,
	signature: string | null,
	secret: string
): boolean {
	if (!signature) return false;
	try {
		const hmac = crypto.createHmac("sha256", secret);
		hmac.update(body, "utf8");
		const expected = hmac.digest("hex");
		return crypto.timingSafeEqual(
			Buffer.from(signature),
			Buffer.from(expected)
		);
	} catch {
		return false;
	}
}
