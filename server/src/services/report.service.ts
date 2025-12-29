import { AppError } from "../libs/helper/error.helper";
import { MessageRepository } from "../repositories/message.repository";
import { VoiceSessionRepository } from "../repositories/voice-session.repository";
import { ConversationStateRepository } from "../repositories/conversation-state.repository";
import { SessionReportClient } from "../libs/ai/session-report.client";
import type { ConversationReport, GenerateSessionReportResponse } from "shared";

type GenerateOpts = {
	userId: string;
	sessionId: string;
	messageLimit?: number;
};

const DEFAULT_MESSAGE_LIMIT = 120;

export class ReportService {
	private sessions = new VoiceSessionRepository();
	private messages = new MessageRepository();
	private states = new ConversationStateRepository();
	private ai = new SessionReportClient();

	async generateSessionReport(
		opts: GenerateOpts
	): Promise<GenerateSessionReportResponse> {
		const session = await this.sessions.findById(opts.sessionId);
		if (!session || session.userId !== opts.userId) {
			throw new AppError("Session not found", 404, "SESSION_NOT_FOUND");
		}

		if (!session.endedAt) {
			throw new AppError(
				"Session has not finished yet",
				400,
				"SESSION_NOT_FINISHED"
			);
		}

		const limit = Math.min(
			Math.max(20, opts.messageLimit ?? DEFAULT_MESSAGE_LIMIT),
			400
		);

		const recent = await this.messages.listRecentBySession(
			opts.sessionId,
			limit
		);
		const chronological = recent.slice().reverse();

		const turnsIncluded = chronological.length;
		const truncated = session.messageCount > turnsIncluded;

		const dateRange =
			turnsIncluded > 0 &&
			chronological[0]?.createdAt &&
			chronological.at(-1)?.createdAt
				? {
						start: new Date(chronological[0]!.createdAt!).toISOString(),
						end: new Date(chronological.at(-1)!.createdAt!).toISOString(),
				  }
				: null;

		const state = await this.states.getByUserId(opts.userId);

		const systemInstruction = [
			"You are Marmalade, an AI assistant generating a neutral report for therapy preparation.",
			"Write as a steady third-party observer.",
			"No diagnosis. No labeling disorders.",
			"Non-diagnostic, reflective summary, not medical advice.",
			"If uncertain, say so briefly and move on.",
		].join("\n");

		const report: ConversationReport = await this.ai.generateReport({
			systemInstruction,
			sessionId: opts.sessionId,
			userId: opts.userId,
			objectiveContext: {
				messageCount: turnsIncluded,
				dateRange,
				maxRiskLevelObserved: session.maxRiskLevel ?? 0,
			},
			stateContext: {
				summary: state?.summary ?? null,
				mood: state?.mood ?? null,
				riskLevel: state?.riskLevel ?? null,
				themes: state?.lastThemes ?? null,
				preferences:
					state?.preferences && typeof state.preferences === "object"
						? (state.preferences as Record<string, unknown>)
						: null,
			},
			conversationWindow: chronological.map((m) => ({
				role: m.role,
				content: m.content,
				createdAt: m.createdAt?.toISOString?.() ?? undefined,
			})),
		});

		return {
			sessionId: opts.sessionId,
			report,
			meta: {
				messageCountUsed: turnsIncluded,
				truncated,
			},
		};
	}
}
