export type MessageRole = "user" | "assistant";

export type Message = {
	id: string;
	userId: string;
	sessionId: string;
	role: MessageRole;
	content: string;
	voiceMode: "comfort" | "coach" | "educational" | "crisis" | null;
	riskAtTurn: number | null;
	themes: string[] | null;
	metadata?: {
		suggestedExercise?: string | null;
		tags?: string[];
		relevantDocs?: { source: string; content: string; type?: string | null }[];
	};
	rawAudioRef?: string | null;
	createdAt?: Date;
};

export type TurnResult = {
	replyText: string;
	voiceMode: "comfort" | "coach" | "educational" | "crisis";
	mood: string;
	riskLevel: number;
	sessionId?: string;
};

export type TextMessageRequest = {
	sessionId?: string;
	message: string;
};

export type TextMessageResponse = TurnResult & {
	sessionId: string;
};
