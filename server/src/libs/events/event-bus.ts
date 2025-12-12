import { EventEmitter } from "events";

const map = new Map<string, EventEmitter>();

export const getEmitter = (sessionId: string) => {
	if (!map.has(sessionId)) map.set(sessionId, new EventEmitter());
	return map.get(sessionId)!;
};

export const deleteEmitter = (sessionId: string) => {
	map.delete(sessionId);
};
