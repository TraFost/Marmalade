import { isNotNull, sql } from "drizzle-orm";

import { db } from "../libs/db/db.lib";
import { kbDocs } from "../libs/db/schemas/kb-docs.schema";

type DBClient = typeof db;

export class KbDocRepository {
	async findRelevantByEmbedding(
		embedding: number[],
		limit = 5,
		client: DBClient = db
	) {
		const vectorLiteral = sql.raw(`'[${embedding.join(",")} ]'::vector`);
		const distance = sql<number>`(${kbDocs.embedding} <=> ${vectorLiteral})`;

		const rows = await client
			.select({
				id: kbDocs.id,
				title: kbDocs.title,
				content: kbDocs.content,
				topic: kbDocs.topic,
				distance,
			})
			.from(kbDocs)
			.where(isNotNull(kbDocs.embedding))
			.orderBy(distance)
			.limit(limit);

		return rows.map((r) => ({
			id: r.id,
			title: r.title,
			content: r.content,
			topic: r.topic,
			distance: r.distance ?? null,
		}));
	}
}

export type RetrievedKbDoc = Awaited<
	ReturnType<KbDocRepository["findRelevantByEmbedding"]>
>[number];
