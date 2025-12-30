import { EmbeddingClient } from "../libs/ai/embedding.client";
import { MemoryDocRepository } from "./memory-doc.repository";
import { KbDocRepository, type KbSearchFilter } from "./kb-doc.repository";
import { db } from "../libs/db/db.lib";

export type RetrievedDoc = {
	source: "memory" | "kb";
	id: string;
	content: string;
	type?: string | null;
	distance?: number | null;
	title?: string | null;
	topic?: string | null;
	tags?: string[] | null;
	severity?: number | null;
};

export class EmbeddingRepository {
	private embedder = new EmbeddingClient();
	private memories = new MemoryDocRepository();
	private kbs = new KbDocRepository();

	private SEARCH_BUFFER_MULTIPLIER = 2;

	async findRelevant(
		userId: string,
		text: string,
		limit = 5,
		filter?: KbSearchFilter,
		client = db
	): Promise<RetrievedDoc[]> {
		const embedding = await this.embedder.embedQuery(text);

		const searchBuffer = limit * this.SEARCH_BUFFER_MULTIPLIER;

		const [memoryHits, kbHits] = await Promise.all([
			this.memories.findRelevantByEmbedding(
				userId,
				embedding,
				searchBuffer,
				client
			),
			this.kbs.findRelevantByEmbedding(embedding, searchBuffer, filter, client),
		]);

		const combined: RetrievedDoc[] = [
			...memoryHits.map((m) => ({
				...m,
				source: "memory" as const,
			})),
			...kbHits.map((k) => ({
				...k,
				source: "kb" as const,
				tags: k.tags,
				severity: k.minSeverity,
			})),
		];

		combined.sort((a, b) => {
			const da = a.distance ?? Number.POSITIVE_INFINITY;
			const db = b.distance ?? Number.POSITIVE_INFINITY;
			return da - db;
		});

		return combined.slice(0, limit);
	}
}
