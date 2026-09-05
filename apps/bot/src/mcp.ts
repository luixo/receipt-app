import { createMCPClient } from "@tanstack/ai-mcp";

import { env } from "./env";

export const mcpClient = await createMCPClient({
	transport: { type: "http", url: env.MCP_SERVER_URL },
});
