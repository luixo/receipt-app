import { stream as grammyStream } from "@grammyjs/stream";
import type { StreamFlavor } from "@grammyjs/stream";
import { EventType, chat } from "@tanstack/ai";
import type { Context } from "grammy";
import { Bot } from "grammy";

import { adapter } from "./adapter";
import { SYSTEM_PROMPT, createQueue } from "./chat";
import { env } from "./env";
import { mcpClient } from "./mcp";

type ChatMessage = { role: "user" | "assistant"; content: string };

// One fixed backend account for every chat until per-Telegram-user
const historyByChatId = new Map<number, ChatMessage[]>();

const bot = new Bot<StreamFlavor<Context>>(env.TELEGRAM_BOT_TOKEN);
bot.use(grammyStream());

const toolStatusLabel = (toolName: string) => `🔧 Calling ${toolName}…`;

const respond = async (ctx: Context, history: ChatMessage[]) => {
	const queue = createQueue(ctx);
	queue.start();

	const stream = chat({
		adapter,
		systemPrompts: [SYSTEM_PROMPT],
		messages: history,
		mcp: { clients: [mcpClient], connection: "keep-alive" },
		stream: true,
	});

	// TODO: rewrite to `await ctx.replyWithStream(stream)`
	for await (const event of stream) {
		if (event.type === EventType.TOOL_CALL_START) {
			queue.send(toolStatusLabel(event.toolCallName), { id: event.toolCallId });
		} else if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
			queue.send(event.delta, { id: event.messageId, append: true });
		} else if (event.type === EventType.RUN_ERROR) {
			throw new Error(event.message);
		}
	}

	return queue.finalize();
};

bot.on("message:text", async (ctx) => {
	const chatId = ctx.chat.id;
	const history = historyByChatId.get(chatId) ?? [];
	historyByChatId.set(chatId, history);
	history.push({ role: "user", content: ctx.message.text });
	try {
		const finalText = await respond(ctx, history);
		history.push({ role: "assistant", content: finalText });
	} catch {
		/* empty */
	}
});

bot.catch((error) => {
	// oxlint-disable-next-line no-console
	console.error("Telegram bot error:", error);
});

const shutdown = async () => {
	console.log("Shutting down, please wait...");
	await mcpClient.close();
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
