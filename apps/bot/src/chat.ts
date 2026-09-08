import { Throttler } from "@tanstack/pacer";
import type { Context } from "grammy";

export const SYSTEM_PROMPT =
	"You are an assistant for a bill-splitting app. Use the provided tools to answer questions about the current account, its debts, and its users. Always call a tool rather than guessing ids or data.";

export const createQueue = (ctx: Context) => {
	const replyDraft = async (text: string) => {
		await ctx.replyWithDraft(text);
	};
	const reply = async (text: string) => {
		await ctx.reply(text);
	};
	let promise = Promise.resolve();
	let finalError: string | null = null;
	let finalMessageId: string | undefined = undefined;
	const addToQueue = (fn: () => Promise<void>) => {
		promise = promise.then(fn).catch((error) => {
			// oxlint-disable-next-line no-console
			console.error("Chat error:", error);
			finalError = String(error);
		});
	};

	const messages: Record<string, string> = {};
	const draftThrottler = new Throttler(replyDraft, {
		wait: 100,
		leading: true,
	});

	return {
		start: () => {
			addToQueue(() => replyDraft(""));
		},
		send: (
			text: string,
			{ id: messageId, append }: { id: string; append?: boolean },
		) => {
			finalMessageId = messageId;
			if (append) {
				messages[messageId] ??= "";
				messages[messageId] += text;
			} else {
				messages[messageId] = text;
			}
			const nextMessage = messages[messageId];
			addToQueue(() => {
				draftThrottler.maybeExecute(nextMessage);
				return Promise.resolve();
			});
		},
		finalize: async () => {
			await promise;
			draftThrottler.cancel();
			const finalMessage: string = finalError
				? "Sorry, something went wrong answering that."
				: (finalMessageId && messages[finalMessageId]) || "…";
			await reply(finalMessage);
			return finalMessage;
		},
	};
};
