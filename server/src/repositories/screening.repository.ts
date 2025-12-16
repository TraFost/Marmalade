import { desc, eq } from "drizzle-orm";

import { db } from "../libs/db/db.lib";
import { screenings } from "../libs/db/schemas/screenings.schema";

import type { NewScreening } from "../libs/db/schemas/screenings.schema";
import type { ScreeningRecord } from "shared";
export class ScreeningRepository {
	async createScreening(data: NewScreening): Promise<ScreeningRecord | null> {
		const [record] = await db.insert(screenings).values(data).returning();
		return (record ?? null) as ScreeningRecord | null;
	}

	async findById(id: string): Promise<ScreeningRecord | null> {
		const [record] = await db
			.select()
			.from(screenings)
			.where(eq(screenings.id, id))
			.limit(1);
		return (record ?? null) as ScreeningRecord | null;
	}

	async updateById(
		id: string,
		updates: Partial<Omit<NewScreening, "id">>
	): Promise<ScreeningRecord | null> {
		const [record] = await db
			.update(screenings)
			.set(updates)
			.where(eq(screenings.id, id))
			.returning();
		return (record ?? null) as ScreeningRecord | null;
	}

	async listByUser(userId: string): Promise<ScreeningRecord[]> {
		const rows = await db
			.select()
			.from(screenings)
			.where(eq(screenings.userId, userId))
			.orderBy(desc(screenings.startedAt));
		return rows as ScreeningRecord[];
	}

	async findLatestCompletedByUser(
		userId: string
	): Promise<ScreeningRecord | null> {
		const [record] = await db
			.select()
			.from(screenings)
			.where(eq(screenings.userId, userId))
			.orderBy(desc(screenings.completedAt), desc(screenings.startedAt))
			.limit(1);
		return (record ?? null) as ScreeningRecord | null;
	}
}
