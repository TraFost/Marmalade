import { ConversationStateRepository } from "../repositories/conversation-state.repository";
import { db } from "../libs/db/db.lib";
import type {
	StateMappingGraphResponse,
	StateMappingUpsertRequest,
	StateMappingSignals,
	UserStateGraph,
} from "shared";

type DBClient = typeof db;

const nowIso = () => new Date().toISOString();

const asObject = (v: unknown): Record<string, unknown> | null =>
	v && typeof v === "object" && !Array.isArray(v) ? (v as any) : null;

const mergeArraysUnique = (a: unknown, b: unknown): string[] => {
	const left = Array.isArray(a) ? a : [];
	const right = Array.isArray(b) ? b : [];
	return Array.from(
		new Set(
			[...left, ...right]
				.filter((x) => typeof x === "string")
				.map((s) => s.trim())
				.filter(Boolean)
		)
	);
};

const ensureGraph = (maybe: unknown): UserStateGraph => {
	const obj = asObject(maybe);
	if (obj && obj.version === 1) return obj as unknown as UserStateGraph;
	return { version: 1, updatedAt: nowIso(), baseline: null, lastRead: null };
};

export class StateMappingService {
	private states = new ConversationStateRepository();

	private async ensureState(userId: string, client: DBClient = db) {
		const existing = await this.states.getByUserId(userId, client);
		if (existing) return existing;
		return this.states.upsert(
			{ userId, mood: "unknown", riskLevel: 0 },
			client
		);
	}

	async getGraph(
		userId: string,
		client: DBClient = db
	): Promise<StateMappingGraphResponse> {
		const state = await this.ensureState(userId, client);

		const prefs = asObject(state.preferences) ?? {};
		const graph = ensureGraph(prefs.userStateGraph);
		const signals = (asObject(prefs.stateMappingSignals) ??
			null) as StateMappingSignals | null;

		return { graph, signals };
	}

	async upsert(
		userId: string,
		input: StateMappingUpsertRequest,
		client: DBClient = db
	) {
		const state = await this.ensureState(userId, client);

		const prefs = asObject(state.preferences) ?? {};
		const graph = ensureGraph(prefs.userStateGraph);

		const existingSignals = asObject(prefs.stateMappingSignals) ?? {};
		const nextSignals = {
			...existingSignals,
			...(asObject(input.signals) ?? {}),
			profile: {
				...(asObject((existingSignals as any).profile) ?? {}),
				...(asObject((input.signals as any)?.profile) ?? {}),
			},
			dass: {
				...(asObject((existingSignals as any).dass) ?? {}),
				...(asObject((input.signals as any)?.dass) ?? {}),
			},
		} satisfies Record<string, unknown>;

		const nextGraph: UserStateGraph = {
			...graph,
			updatedAt: nowIso(),
			anchors: {
				goals: mergeArraysUnique(
					(graph.anchors as any)?.goals,
					input.anchors?.goals
				),
				lifeAnchors: mergeArraysUnique(
					(graph.anchors as any)?.lifeAnchors,
					input.anchors?.lifeAnchors
				),
				values: mergeArraysUnique(
					(graph.anchors as any)?.values,
					input.anchors?.values
				),
				rememberedDreams: mergeArraysUnique(
					(graph.anchors as any)?.rememberedDreams,
					input.anchors?.rememberedDreams
				),
			},
			patterns: {
				recurringTimeWindows: mergeArraysUnique(
					(graph.patterns as any)?.recurringTimeWindows,
					input.patterns?.recurringTimeWindows
				),
				triggers: mergeArraysUnique(
					(graph.patterns as any)?.triggers,
					input.patterns?.triggers
				),
				collapseModes: mergeArraysUnique(
					(graph.patterns as any)?.collapseModes,
					input.patterns?.collapseModes
				),
			},
		};

		await this.states.updateByUserId(
			userId,
			{
				preferences: {
					...prefs,
					userStateGraph: nextGraph,
					stateMappingSignals: nextSignals,
				},
			},
			client
		);

		return this.getGraph(userId, client);
	}
}
