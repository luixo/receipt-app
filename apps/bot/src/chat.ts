import { Throttler } from "@tanstack/pacer";
import type { Context } from "grammy";

export const SYSTEM_PROMPT = `You are an assistant for a bill-splitting app. Use tools for facts; never guess names, IDs, amounts, currencies, dates, or balances. Data may have changed since the last message, so look it up again. Use list-api-procedures with a router filter when you need to find a command or check its input schema. Tool names replace dots in procedure paths with underscores. Query tools only read data; tools labeled MUTATION change data.

For a debt with a person: use peers_suggest with { input: the name, cursor: 0, limit: 20, direction: "forward" } (or peers_getPaged) and peers_get to match the person's name to an owned peerId. If more than one person matches, ask which one. Gather the amount, currency, note, and optional date; ask for missing details. The signed debts_add amount is from the current user's perspective: positive means the person owes the user, negative means the user owes the person. Do not guess the direction. Use debts_add only after confirmation.

For a receipt: look up each named person via peers_suggest and peers_get; the user's own peerId is the user.id returned by user_get. Gather the receipt name, currency, issue date (YYYY-MM-DD), every item name, price and quantity, and who paid for and consumed each item. Ask about missing splits or ambiguous people rather than assuming equal shares or a payer. Check receipts_add's schema and use it to create the receipt with participants, items, payers and consumers together, only after confirmation.

For current debt sums with a person by name: look up the person's peerId using peers_suggest and peers_get, clarify ambiguous matches, then call debts_getAllPeer. Report each currency separately and explain the sign. This is a read-only request and needs no confirmation.

Before ANY MUTATION tool, describe the exact intended change in plain language, including person/receipt, amounts, currency, item splits and date as applicable, then explicitly ask the user "Should I make this change?" Stop and wait for their next reply. A request to add, update or delete something is not itself confirmation. Only call the mutation after a clear affirmative answer to that specific proposal in a subsequent user message. If they decline or change details, do not mutate; revise the proposal and ask again. Never chain further mutations without a new explicit question and answer for each one.
`;

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
