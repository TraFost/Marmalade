import { db } from "../libs/db/db.lib";
import { messages } from "../libs/db/schemas/messages.schema";
import type { Message, NewMessage } from "../libs/db/schemas/messages.schema";
import { desc, eq } from "drizzle-orm";

type DBClient = typeof db;

export class MessageRepository {
	async create(data: NewMessage, client: DBClient = db): Promise<Message> {
		const [record] = await client.insert(messages).values(data).returning();

		if (!record) {
			throw new Error("Failed to create message");
		}

		return record;
	}

	async createIfNotExists(
		data: NewMessage,
		client: DBClient = db
	): Promise<{ created: boolean; record?: Message }> {
		if (data.messageId) {
			const [existing] = await client
				.select()
				.from(messages)
				.where(eq(messages.messageId, data.messageId))
				.limit(1);
			if (existing) {
				return { created: false, record: existing };
			}

			const [inserted] = await client.insert(messages).values(data).returning();
			if (inserted) return { created: true, record: inserted };

			const [maybe] = await client
				.select()
				.from(messages)
				.where(eq(messages.messageId, data.messageId))
				.limit(1);
			if (maybe) return { created: false, record: maybe };

			return { created: false };
		}

		const rec = await this.create(data, client);
		return { created: true, record: rec };
	}

	async listRecentBySession(
		sessionId: string,
		limit = 10,
		client: DBClient = db
	): Promise<Message[]> {
		return client
			.select()
			.from(messages)
			.where(eq(messages.sessionId, sessionId))
			.orderBy(desc(messages.createdAt))
			.limit(limit);
	}

	async countBySession(
		sessionId: string,
		client: DBClient = db
	): Promise<number> {
		const rows = await client
			.select({ count: messages.id })
			.from(messages)
			.where(eq(messages.sessionId, sessionId));
		return rows.length;
	}
}
