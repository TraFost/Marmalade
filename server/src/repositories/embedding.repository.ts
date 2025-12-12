import { EmbeddingClient } from "../libs/ai/embedding.client";
import { MemoryDocRepository } from "./memory-doc.repository";
import { KbDocRepository } from "./kb-doc.repository";

export type RetrievedDoc = {
	source: "memory" | "kb";
	id: string;
	content: string;
	type?: string | null;
	distance?: number | null;
	title?: string | null;
	topic?: string | null;
};

export class EmbeddingRepository {
	private embedder = new EmbeddingClient();
	private memories = new MemoryDocRepository();
	private kbs = new KbDocRepository();

	async findRelevant(userId: string, text: string, limit = 5) {
		const embedding = await this.embedder.embed(text);
		const [memoryHits, kbHits] = await Promise.all([
			this.memories.findRelevantByEmbedding(userId, embedding, limit),
			this.kbs.findRelevantByEmbedding(embedding, limit),
		]);

		const combined = [
			...memoryHits.map((m) => ({ ...m, source: "memory" as const })),
			...kbHits.map((k) => ({ ...k, source: "kb" as const })),
		];

		combined.sort((a, b) => {
			const da = a.distance ?? Number.POSITIVE_INFINITY;
			const db = b.distance ?? Number.POSITIVE_INFINITY;
			return da - db;
		});

		return combined.slice(0, limit);
	}
}
