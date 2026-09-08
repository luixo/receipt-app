import { stream as grammyStream } from "@grammyjs/stream";
import type { StreamFlavor } from "@grammyjs/stream";
import { EventType, chat } from "@tanstack/ai";
import type { Context } from "grammy";
import { Bot, InlineKeyboard } from "grammy";

import { adapter } from "./adapter";
import { SYSTEM_PROMPT, createQueue } from "./chat";
import { env } from "./env";
import { getChatMcpClient, mcpClient } from "./mcp";

type ChatMessage = { role: "user" | "assistant"; content: string };

const historyByChatId = new Map<number, ChatMessage[]>();

const bot = new Bot<StreamFlavor<Context>>(env.TELEGRAM_BOT_TOKEN);
bot.use(grammyStream());

const toolStatusLabel = (toolName: string) => `🔧 Calling ${toolName}…`;
const toBotUserId = (telegramUserId: number) => `tg:${telegramUserId}`;

const respond = async (
	ctx: Context,
	history: ChatMessage[],
	botUserId: string,
) => {
	const queue = createQueue(ctx);
	queue.start();

	const stream = chat({
		adapter,
		systemPrompts: [SYSTEM_PROMPT],
		messages: history,
		mcp: {
			clients: [await getChatMcpClient(botUserId)],
			connection: "keep-alive",
		},
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

bot.command("start", async (ctx) => {
	await ctx.reply("Authorize to let me act on your behalf:", {
		reply_markup: new InlineKeyboard().webApp(
			"Authorize",
			`${env.WEB_BASE_URL}/bot-link`,
		),
	});
});

bot.on("message:text", async (ctx) => {
	const chatId = ctx.chat.id;
	const botUserId = toBotUserId(ctx.from.id);
	const authCheck = await mcpClient.callTool("sessions_isBotAuthorized", {
		botUserId,
	});
	const authorized = Boolean(
		(authCheck.structuredContent as { authorized?: boolean } | undefined)
			?.authorized,
	);
	if (!authorized) {
		await ctx.reply("Please authorize first with /start");
		return;
	}
	const history = historyByChatId.get(chatId) ?? [];
	historyByChatId.set(chatId, history);
	history.push({ role: "user", content: ctx.message.text });
	try {
		const finalText = await respond(ctx, history, botUserId);
		history.push({ role: "assistant", content: finalText });
	} catch (error) {
		// oxlint-disable-next-line no-console
		console.error("Failed to respond to chat message:", error);
	}
});

bot.catch((error) => {
	// oxlint-disable-next-line no-console
	console.error("Telegram bot error:", error);
});

const shutdown = async () => {
	// oxlint-disable-next-line no-console
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
