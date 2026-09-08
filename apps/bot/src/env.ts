import { createEnv } from "@t3-oss/env-core";
import { OPENROUTER_CHAT_MODELS } from "@tanstack/ai-openrouter/model-meta";
import { z } from "zod";

export const env = createEnv({
	server: {
		TELEGRAM_BOT_TOKEN: z.string(),
		OPENROUTER_MODEL: z.literal(OPENROUTER_CHAT_MODELS).optional(),
		MCP_SERVER_URL: z.url().catch("http://localhost:3000/api/mcp"),
	},
	// This is the only place it can be used
	/* oxlint-disable node/no-process-env */
	runtimeEnv: process.env,
	skipValidation: Boolean(process.env.TEST),
	/* oxlint-enable node/no-process-env */
});
