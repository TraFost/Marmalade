import { db } from "../libs/db/db.lib";
import { voiceSessions } from "../libs/db/schemas/voice-sessions.schema";
import type {
	NewVoiceSession,
	VoiceSession,
} from "../libs/db/schemas/voice-sessions.schema";
import { and, eq, lt, sql } from "drizzle-orm";

type DBClient = typeof db;

export class VoiceSessionRepository {
	async create(
		userId: string,
		client: DBClient = db,
		externalId?: string | null
	): Promise<VoiceSession> {
		const payload: NewVoiceSession = {
			userId,
			...(externalId ? { externalId } : {}),
		};
		const [record] = await client
			.insert(voiceSessions)
			.values(payload)
			.returning();
		if (!record) {
			throw new Error("Failed to create voice session");
		}
		return record;
	}

	async findById(
		id: string,
		client: DBClient = db
	): Promise<VoiceSession | null> {
		const [record] = await client
			.select()
			.from(voiceSessions)
			.where(eq(voiceSessions.id, id))
			.limit(1);
		return record ?? null;
	}

	async endSession(
		id: string,
		updates: Partial<NewVoiceSession>,
		client: DBClient = db
	) {
		const [record] = await client
			.update(voiceSessions)
			.set(updates)
			.where(eq(voiceSessions.id, id))
			.returning();
		return record ?? null;
	}

	async findByExternalId(
		userId: string,
		externalId: string,
		client: DBClient = db
	): Promise<VoiceSession | null> {
		const [record] = await client
			.select()
			.from(voiceSessions)
			.where(
				and(
					eq(voiceSessions.userId, userId),
					eq(voiceSessions.externalId, externalId)
				)
			)
			.limit(1);
		return record ?? null;
	}

	async updateMaxRisk(id: string, risk: number, client: DBClient = db) {
		await client
			.update(voiceSessions)
			.set({ maxRiskLevel: risk })
			.where(
				and(eq(voiceSessions.id, id), lt(voiceSessions.maxRiskLevel, risk))
			);
	}

	async incrementMessageCount(id: string, delta = 1, client: DBClient = db) {
		await client
			.update(voiceSessions)
			.set({ messageCount: sql`${voiceSessions.messageCount} + ${delta}` })
			.where(eq(voiceSessions.id, id));
	}
}
