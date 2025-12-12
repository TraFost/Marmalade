import { EventEmitter } from "events";

type Wrapper = { emitter: EventEmitter; lastUsed: number };
const map = new Map<string, Wrapper>();
const TTL = 1000 * 60 * 15; // 15 minutes
const MAX_LISTENERS = 50;

export const getEmitter = (sessionId: string) => {
	const now = Date.now();
	if (!map.has(sessionId)) {
		const e = new EventEmitter();
		e.setMaxListeners(MAX_LISTENERS);
		map.set(sessionId, { emitter: e, lastUsed: now });
	} else {
		const w = map.get(sessionId)!;
		w.lastUsed = now;
	}
	return map.get(sessionId)!.emitter;
};

export const deleteEmitter = (sessionId: string) => {
	const wrapper = map.get(sessionId);
	if (!wrapper) return;
	try {
		wrapper.emitter.removeAllListeners();
	} catch (_) {}
	map.delete(sessionId);
};

export const maybeDeleteIfUnused = (sessionId: string) => {
	const wrapper = map.get(sessionId);
	if (!wrapper) return;
	const e = wrapper.emitter;
	// check relevant event types
	const listeners = e.listenerCount("phase") + e.listenerCount("end");
	if (listeners === 0) deleteEmitter(sessionId);
};

// Periodic cleanup for stale emitters
setInterval(() => {
	const now = Date.now();
	for (const [id, w] of Array.from(map.entries())) {
		if (now - w.lastUsed > TTL) {
			try {
				w.emitter.removeAllListeners();
			} catch (_) {}
			map.delete(id);
		}
	}
}, TTL);
