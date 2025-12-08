import { GoogleAuth } from "google-auth-library";

import { env } from "../../configs/env.config";

export type EmbeddingQuery = {
	userMessage: string;
	themes: string[];
	summary?: string | null;
};

export type RetrievedDoc = {
	source: "memory" | "kb";
	content: string;
	type?: string | null;
};

export class EmbeddingClient {
	private auth = new GoogleAuth({
		scopes: ["https://www.googleapis.com/auth/cloud-platform"],
	});

	async retrieveRelevant(_input: EmbeddingQuery): Promise<RetrievedDoc[]> {
		const text = [
			_input.userMessage,
			(_input.summary ?? "").slice(0, 400),
			(_input.themes ?? []).join(", "),
		]
			.filter(Boolean)
			.join("\n");

		await this.embed(text);
		return [];
	}

	private async embed(text: string) {
		const client = await this.auth.getClient();
		const url = `https://${env.VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${env.GOOGLE_CLOUD_PROJECT_ID}/locations/${env.VERTEX_LOCATION}/publishers/google/models/${env.VERTEX_EMBEDDING_MODEL}:embedContent`;
		await client.request({
			url,
			method: "POST",
			data: {
				content: {
					parts: [{ text }],
				},
			},
		});
	}
}
