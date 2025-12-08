import { db } from "../libs/db/db.lib";
import { riskLogs } from "../libs/db/schemas/risk-logs.schema";
import type { NewRiskLog, RiskLog } from "../libs/db/schemas/risk-logs.schema";
import { eq } from "drizzle-orm";

type DBClient = typeof db;

export class RiskLogRepository {
	async create(data: NewRiskLog, client: DBClient = db): Promise<RiskLog> {
		const [record] = await client.insert(riskLogs).values(data).returning();

		if (!record) {
			throw new Error("Failed to create risk log");
		}

		return record;
	}

	async listBySession(
		sessionId: string,
		client: DBClient = db
	): Promise<RiskLog[]> {
		return client
			.select()
			.from(riskLogs)
			.where(eq(riskLogs.sessionId, sessionId));
	}
}
