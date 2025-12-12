import { and, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "../libs/db/db.lib";
import { userMemoryDocs } from "../libs/db/schemas/user-memory-docs.schema";
import type {
	NewUserMemoryDoc,
	UserMemoryDoc,
} from "../libs/db/schemas/user-memory-docs.schema";

type DBClient = typeof db;

export class MemoryDocRepository {
	async create(
		data: NewUserMemoryDoc,
		client: DBClient = db
	): Promise<UserMemoryDoc> {
		const [record] = await client
			.insert(userMemoryDocs)
			.values(data)
			.returning();

		if (!record) {
			throw new Error("Failed to create memory document");
		}

		return record;
	}

	async findRelevantByEmbedding(
		userId: string,
		embedding: number[],
		limit = 5,
		client: DBClient = db
	) {
		const vectorLiteral = sql.raw(`'[${embedding.join(",")}]'::vector`);
		const distance = sql<number>`(${userMemoryDocs.embedding} <=> ${vectorLiteral})`;

		const rows = await client
			.select({
				id: userMemoryDocs.id,
				content: userMemoryDocs.content,
				type: userMemoryDocs.type,
				distance,
			})
			.from(userMemoryDocs)
			.where(
				and(
					eq(userMemoryDocs.userId, userId),
					isNotNull(userMemoryDocs.embedding)
				)
			)
			.orderBy(distance)
			.limit(limit);

		return rows.map((row) => ({
			id: row.id,
			content: row.content,
			type: row.type,
			distance: row.distance ?? null,
		}));
	}
}
