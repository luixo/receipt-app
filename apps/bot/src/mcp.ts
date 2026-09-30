import { createMCPClient } from "@tanstack/ai-mcp";
import { serialize } from "cookie";

import { AUTH_COOKIE } from "~app/utils/auth";
import type { SessionId } from "~db/ids";

import { env } from "./env";

const chatMcpClients = new Map<string, ReturnType<typeof createMCPClient>>();
export const getChatMcpClient = (botUserId: string, sessionId: SessionId) => {
	const existing = chatMcpClients.get(botUserId);
	if (existing) {
		return existing;
	}
	const client = createMCPClient({
		transport: {
			type: "http",
			url: env.MCP_SERVER_URL,
			headers: { Cookie: serialize(AUTH_COOKIE, sessionId) },
		},
	});
	chatMcpClients.set(botUserId, client);
	return client;
};
export const clearChatMcpClient = (botUserId: string) => {
	chatMcpClients.delete(botUserId);
};
