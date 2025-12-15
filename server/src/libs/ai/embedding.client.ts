import { GoogleAuth } from "google-auth-library";

import { env } from "../../configs/env.config";

export class EmbeddingClient {
	private auth = new GoogleAuth({
		scopes: ["https://www.googleapis.com/auth/cloud-platform"],
	});

	async embed(text: string): Promise<number[]> {
		const client = await this.auth.getClient();

		const url = `https://${env.VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${env.GOOGLE_CLOUD_PROJECT_ID}/locations/${env.VERTEX_LOCATION}/publishers/google/models/${env.VERTEX_EMBEDDING_MODEL}:predict`;

		const res = await client.request<any>({
			url,
			method: "POST",
			data: {
				instances: [
					{
						content: text,
						task_type: "RETRIEVAL_QUERY",
					},
				],
			},
		});

		console.log(res, "res");

		const predictions = res.data?.predictions;

		if (!predictions || !predictions[0]?.embeddings?.values) {
			console.error(
				"Embedding Error Payload:",
				JSON.stringify(res.data, null, 2)
			);
			throw new Error("Embedding model returned empty values");
		}

		const values = predictions[0].embeddings.values;
		return values.map((v: any) => Number(v));
	}
}
