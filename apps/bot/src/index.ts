import { stream as grammyStream } from "@grammyjs/stream";
import type { StreamFlavor } from "@grammyjs/stream";
import type { StreamChunk } from "@tanstack/ai";
import { EventType, chat } from "@tanstack/ai";
import { clearToolResults, withCompaction } from "@tanstack/ai-compaction";
import type { Context } from "grammy";
import { Bot, InlineKeyboard } from "grammy";

import { getServerTrpcClient } from "~web/utils/trpc";

import { adapter } from "./adapter";
import { SYSTEM_PROMPT } from "./chat";
import { env } from "./env";
import { persistenceMiddleware, threadIdFor } from "./persistence";
import { tools } from "./tools";

const trpcClient = getServerTrpcClient({
	url: env.WEB_BASE_URL,
	source: "bot",
});

const bot = new Bot<StreamFlavor<Context>>(env.TELEGRAM_BOT_TOKEN);
bot.use(grammyStream());

const toBotUserId = (telegramUserId: number) => `tg:${telegramUserId}`;

bot.command("start", async (ctx) => {
	await ctx.reply("Authorize to let me act on your behalf:", {
		reply_markup: new InlineKeyboard().webApp(
			"🔑 Authorize",
			`${env.WEB_BASE_URL}/login?bot=telegram`,
		),
	});
});

bot.command("new", async (ctx) => {
	await threadIdFor(ctx.chat.id, true);
	await ctx.reply("Started a fresh conversation 👋");
});

// oxlint-disable-next-line func-style
async function* textDeltas(
	chunks: AsyncIterable<StreamChunk>,
	onFirstText?: () => void,
) {
	let currentMessageId: string | undefined = undefined;
	for await (const chunk of chunks) {
		if (chunk.type === EventType.RUN_ERROR) {
			throw new Error(chunk.message);
		}
		if (chunk.type === EventType.TEXT_MESSAGE_CONTENT && chunk.delta) {
			if (!currentMessageId) {
				onFirstText?.();
			}
			// With tools, one run can hold several assistant messages
			// (text → tool call → more text). Keep them apart.
			else if (chunk.messageId !== currentMessageId) {
				yield "\n\n";
			}
			currentMessageId = chunk.messageId;
			yield chunk.delta;
		}
	}
}

bot.on("message:text", async (ctx) => {
	const abortController = new AbortController();
	const chatId = ctx.chat.id;
	const botUserId = toBotUserId(ctx.from.id);
	const auth = await trpcClient.bot.getAuthorization.query({
		botUserId,
	});
	if (!auth) {
		await ctx.reply("Please authorize first with /start");
		return;
	}
	await ctx.replyWithChatAction("typing");
	const typing = setInterval(() => {
		void ctx.replyWithChatAction("typing").catch(() => undefined);
	}, 4000);
	const stopTyping = () => clearInterval(typing);

	const threadId = await threadIdFor(ctx.chat.id);
	try {
		const chunks = chat({
			adapter,
			systemPrompts: [SYSTEM_PROMPT],
			messages: [
				{
					role: "user",
					content: ctx.message.text,
				},
			],
			threadId,
			middleware: [
				persistenceMiddleware,
				withCompaction({
					maxTokens: 30_000,
					strategy: clearToolResults({ keepRecentToolResults: 6 }),
				}),
			],
			tools,
			context: { sessionId: auth.sessionId },
			abortController,
			modelOptions: {
				reasoning: { effort: "none" },
				models: ["google/gemini-3.1-flash-lite"],
				sessionId: chatId.toString(),
			},
		});
		const text = textDeltas(chunks, stopTyping);
		await ctx.replyWithMarkdownStream(
			text,
			undefined,
			undefined,
			undefined,
			abortController.signal,
		);
	} finally {
		stopTyping();
	}
});

bot.catch((error) => {
	// oxlint-disable-next-line no-console
	console.error("Telegram bot error:", error);
});

const shutdown = async () => {
	// oxlint-disable-next-line no-console
	console.log("Shutting down, please wait...");
	await bot.stop();
	// oxlint-disable-next-line unicorn/no-process-exit
	process.exit();
};
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

await bot.start({
	onStart: () => {
		// oxlint-disable-next-line no-console
		console.log(`Telegram bot started`);
	},
});
