import { eq } from "drizzle-orm";

import { db } from "../libs/db/db.lib";
import { users } from "../libs/db/schemas/users.schema";

export class AuthRepository {
	async findUserByEmail(email: string) {
		return await db.select().from(users).where(eq(users.email, email)).limit(1);
	}

	async findUserById(id: string) {
		return await db.select().from(users).where(eq(users.id, id)).limit(1);
	}

	async createUser(userData: {
		id: string;
		email: string;
		name?: string;
		image?: string;
	}) {
		return await db.insert(users).values(userData).returning();
	}

	async updateUser(
		id: string,
		updates: Partial<{
			name: string;
			image: string;
			email: string;
		}>
	) {
		return await db
			.update(users)
			.set(updates)
			.where(eq(users.id, id))
			.returning();
	}

	async deleteUser(id: string) {
		return await db.delete(users).where(eq(users.id, id));
	}
}
