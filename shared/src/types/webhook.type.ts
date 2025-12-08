export type ElevenLabsTurnWebhookPayload = {
	user_id: string;
	session_id?: string | null;
	transcript: string;
	audio_segment_id?: string | null;
};
