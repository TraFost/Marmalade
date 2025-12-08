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
}
