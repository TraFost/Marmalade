import { db } from "../libs/db/db.lib";
import { conversationStates } from "../libs/db/schemas/conversation-state.schema";
import type {
	ConversationState,
	NewConversationState,
} from "../libs/db/schemas/conversation-state.schema";
import { eq } from "drizzle-orm";

type DBClient = typeof db;

export class ConversationStateRepository {
	async getByUserId(
		userId: string,
		client: DBClient = db
	): Promise<ConversationState | null> {
		const [record] = await client
			.select()
			.from(conversationStates)
			.where(eq(conversationStates.userId, userId))
			.limit(1);
		return record ?? null;
	}

	async upsert(
		state: NewConversationState,
		client: DBClient = db
	): Promise<ConversationState> {
		const [record] = await client
			.insert(conversationStates)
			.values(state)
			.onConflictDoUpdate({
				target: conversationStates.userId,
				set: state,
			})
			.returning();
		if (!record) {
			throw new Error("Failed to upsert conversation state");
		}
		return record;
	}

	async updateByUserId(
		userId: string,
		updates: Partial<NewConversationState>,
		client: DBClient = db
	): Promise<ConversationState | null> {
		const [record] = await client
			.update(conversationStates)
			.set(updates)
			.where(eq(conversationStates.userId, userId))
			.returning();
		return record ?? null;
	}
}
