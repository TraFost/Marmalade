import { GoogleAuth } from "google-auth-library";

import { env } from "../../configs/env.config";
import { logger } from "../logger";

export type VertexEmbeddingTaskType = "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT";

export class EmbeddingClient {
	private auth = new GoogleAuth({
		scopes: ["https://www.googleapis.com/auth/cloud-platform"],
	});

	embedQuery(text: string): Promise<number[]> {
		return this.embed(text, "RETRIEVAL_QUERY");
	}

	embedDocument(text: string): Promise<number[]> {
		return this.embed(text, "RETRIEVAL_DOCUMENT");
	}

	async embed(
		text: string,
		taskType: VertexEmbeddingTaskType = "RETRIEVAL_QUERY"
	): Promise<number[]> {
		const startedAt = Date.now();
		const textLength = text.length;

		logger.info(
			{
				taskType,
				model: env.VERTEX_EMBEDDING_MODEL,
				textLength,
			},
			"[Embedding] request"
		);

		const client = await this.auth.getClient();

		const url = `https://${env.VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${env.GOOGLE_CLOUD_PROJECT_ID}/locations/${env.VERTEX_LOCATION}/publishers/google/models/${env.VERTEX_EMBEDDING_MODEL}:predict`;

		let res: any;
		try {
			res = await client.request<any>({
				url,
				method: "POST",
				data: {
					instances: [
						{
							content: text,
							task_type: taskType,
						},
					],
				},
			});
		} catch (e) {
			logger.error(
				{
					err: e,
					taskType,
					model: env.VERTEX_EMBEDDING_MODEL,
					textLength,
					durationMs: Date.now() - startedAt,
				},
				"[Embedding] request failed"
			);
			throw e;
		}

		const predictions = res.data?.predictions;

		if (!predictions || !predictions[0]?.embeddings?.values) {
			logger.error(
				{
					taskType,
					model: env.VERTEX_EMBEDDING_MODEL,
					textLength,
					responseKeys:
						res?.data && typeof res.data === "object"
							? Object.keys(res.data)
							: null,
					durationMs: Date.now() - startedAt,
				},
				"[Embedding] model returned empty values"
			);
			throw new Error("Embedding model returned empty values");
		}

		const values = predictions[0].embeddings.values;
		const vector = values.map((v: any) => Number(v));

		logger.info(
			{
				taskType,
				model: env.VERTEX_EMBEDDING_MODEL,
				textLength,
				durationMs: Date.now() - startedAt,
				dimensions: vector.length,
			},
			"[Embedding] response"
		);

		return vector;
	}
}
