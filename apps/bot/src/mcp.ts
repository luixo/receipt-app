import { createMCPClient } from "@tanstack/ai-mcp";

import { env } from "./env";

export const mcpClient = await createMCPClient({
	transport: { type: "http", url: env.MCP_SERVER_URL },
});

// A dedicated client per bot user id, carrying it as a header so the server
// can resolve the right account for every business-tool call. Safe to cache
// indefinitely - the header is an id, not a secret.
const chatMcpClients = new Map<string, ReturnType<typeof createMCPClient>>();
export const getChatMcpClient = (botUserId: string) => {
	const existing = chatMcpClients.get(botUserId);
	if (existing) {
		return existing;
	}
	const client = createMCPClient({
		transport: {
			type: "http",
			url: env.MCP_SERVER_URL,
			headers: { "X-Bot-User-Id": botUserId },
		},
	});
	chatMcpClients.set(botUserId, client);
	return client;
};
