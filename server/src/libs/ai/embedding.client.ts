import { GoogleAuth } from "google-auth-library";

import { env } from "../../configs/env.config";

export type EmbeddingQuery = {
	userId: string;
	userMessage: string;
	themes?: string[];
	summary?: string | null;
};

export class EmbeddingClient {
	private auth = new GoogleAuth({
		scopes: ["https://www.googleapis.com/auth/cloud-platform"],
	});

	async embed(text: string): Promise<number[]> {
		const client = await this.auth.getClient();
		const url = `https://${env.VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${env.GOOGLE_CLOUD_PROJECT_ID}/locations/${env.VERTEX_LOCATION}/publishers/google/models/${env.VERTEX_EMBEDDING_MODEL}:embedContent`;
		const res = await client.request<{ embedding?: { values?: number[] } }>({
			url,
			method: "POST",
			data: {
				content: {
					parts: [{ text }],
				},
			},
		});

		const values = res.data?.embedding?.values;
		if (!Array.isArray(values) || values.length === 0) {
			throw new Error("Embedding model returned empty values");
		}

		return values.map((v) => Number(v));
	}
}
