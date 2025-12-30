import { isNotNull, sql, gte, arrayOverlaps, and } from "drizzle-orm";

import { db } from "../libs/db/db.lib";
import { kbDocs } from "../libs/db/schemas/kb-docs.schema";

type DBClient = typeof db;

export type KbSearchFilter = {
	tags?: string[]; // e.g., ["react", "bug-fix"]
	minSeverity?: number; // e.g., 1, 2, 3
};

export class KbDocRepository {
	async findRelevantByEmbedding(
		embedding: number[],
		limit = 5,
		filter?: KbSearchFilter,
		client: DBClient = db
	) {
		const vectorLiteral = sql.raw(`'[${embedding.join(",")}]'::vector`);
		const distance = sql<number>`(${kbDocs.embedding} <=> ${vectorLiteral})`;

		const conditions = [isNotNull(kbDocs.embedding)];

		if (filter?.minSeverity !== undefined) {
			conditions.push(gte(kbDocs.minSeverity, filter.minSeverity));
		}

		if (filter?.tags && filter.tags.length > 0) {
			conditions.push(arrayOverlaps(kbDocs.tags, filter.tags));
		}

		const rows = await client
			.select({
				id: kbDocs.id,
				title: kbDocs.title,
				content: kbDocs.content,
				topic: kbDocs.topic,
				tags: kbDocs.tags,
				minSeverity: kbDocs.minSeverity,
				distance,
			})
			.from(kbDocs)
			.where(and(...conditions))
			.orderBy(distance)
			.limit(limit);

		return rows.map((r) => ({
			id: r.id,
			title: r.title,
			content: r.content,
			topic: r.topic,
			tags: r.tags,
			minSeverity: r.minSeverity,
			distance: r.distance ?? null,
		}));
	}
}

export type RetrievedKbDoc = Awaited<
	ReturnType<KbDocRepository["findRelevantByEmbedding"]>
>[number];
