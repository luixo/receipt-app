import type { ModelMessage } from "@tanstack/ai";
import {
	defineAIPersistence,
	defineMessageStore,
	withPersistence,
} from "@tanstack/ai-persistence";

const historyByThreadId = new Map<
	string,
	{
		messages: ModelMessage[];
		lastActive: Temporal.Instant;
	}
>();
const threadIdByChatId = new Map<number, string>();
const persistence = defineAIPersistence({
	stores: {
		/* oxlint-disable typescript/require-await */
		messages: defineMessageStore({
			// Must return [] (never null) for a new thread
			loadThread: async (threadId) =>
				historyByThreadId.get(threadId)?.messages ?? [],
			// Receives the FULL transcript, so overwrite rather than append
			saveThread: async (threadId, messages) => {
				historyByThreadId.set(threadId, {
					messages: messages as ModelMessage[],
					lastActive: Temporal.Now.instant(),
				});
			},
		}),
		/* oxlint-enable typescript/require-await */
	},
});

export const persistenceMiddleware = withPersistence(persistence);

const clearOldThread = (threadId: string) => historyByThreadId.delete(threadId);
const resetThread = (chatId: number) => {
	const now = Temporal.Now.instant();
	const nextThreadId = `${chatId}:${now.epochMilliseconds}`;
	// Add a new thread
	threadIdByChatId.set(chatId, nextThreadId);
	historyByThreadId.set(nextThreadId, { messages: [], lastActive: now });
	return nextThreadId;
};
// oxlint-disable typescript/require-await
export const threadIdFor = async (chatId: number, forceNew = false) => {
	const now = Temporal.Now.instant();
	const currentThreadId = threadIdByChatId.get(chatId);
	if (forceNew || !currentThreadId) {
		if (currentThreadId) {
			clearOldThread(currentThreadId);
		}
		return resetThread(chatId);
	}
	const currentHistory = historyByThreadId.get(currentThreadId);
	if (!currentHistory) {
		return resetThread(chatId);
	}
	if (
		now
			.subtract({ hours: 1 })
			.until(currentHistory.lastActive)
			.total("milliseconds") > 0
	) {
		clearOldThread(currentThreadId);
		return resetThread(chatId);
	}
	historyByThreadId.set(currentThreadId, {
		...currentHistory,
		lastActive: now,
	});
	return currentThreadId;
};
