import { desc, eq } from "drizzle-orm";

import { db } from "../libs/db/db.lib";
import { screenings } from "../libs/db/schemas/screenings.schema";
import type { NewScreening } from "../libs/db/schemas/screenings.schema";

export class ScreeningRepository {
	async createScreening(data: NewScreening) {
		const [record] = await db.insert(screenings).values(data).returning();
		return record ?? null;
	}

	async findById(id: string) {
		const [record] = await db
			.select()
			.from(screenings)
			.where(eq(screenings.id, id))
			.limit(1);
		return record ?? null;
	}

	async updateById(id: string, updates: Partial<Omit<NewScreening, "id">>) {
		const [record] = await db
			.update(screenings)
			.set(updates)
			.where(eq(screenings.id, id))
			.returning();
		return record ?? null;
	}

	async listByUser(userId: string) {
		return db
			.select()
			.from(screenings)
			.where(eq(screenings.userId, userId))
			.orderBy(desc(screenings.startedAt));
	}
}
