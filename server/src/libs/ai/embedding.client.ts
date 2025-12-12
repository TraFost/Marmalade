import { GoogleAuth } from "google-auth-library";

import { env } from "../../configs/env.config";
import { MemoryDocRepository } from "../../repositories/memory-doc.repository";

export type EmbeddingQuery = {
	userId: string;
	userMessage: string;
	themes?: string[];
	summary?: string | null;
};

export type RetrievedDoc = {
	source: "memory" | "kb";
	content: string;
	type?: string | null;
	distance?: number | null;
};

export class EmbeddingClient {
	private auth = new GoogleAuth({
		scopes: ["https://www.googleapis.com/auth/cloud-platform"],
	});
	private memories = new MemoryDocRepository();

	async retrieveRelevant(input: EmbeddingQuery): Promise<RetrievedDoc[]> {
		try {
			const text = [
				input.userMessage,
				(input.summary ?? "").slice(0, 400),
				(input.themes ?? []).join(", "),
			]
				.filter(Boolean)
				.join("\n");

			const queryEmbedding = await this.embed(text);
			const memoryHits = await this.memories.findRelevantByEmbedding(
				input.userId,
				queryEmbedding,
				5
			);

			return memoryHits.map((hit) => ({
				source: "memory",
				content: hit.content,
				type: hit.type,
				distance: hit.distance,
			}));
		} catch (error) {
			console.error("Embedding retrieveRelevant failed", error);
			return [];
		}
	}

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
