import { createEnv } from "@t3-oss/env-core";
import { OPENROUTER_CHAT_MODELS } from "@tanstack/ai-openrouter/model-meta";
import { z } from "zod";

export const env = createEnv({
	server: {
		TELEGRAM_BOT_TOKEN: z.string(),
		OPENROUTER_MODEL: z
			.literal(OPENROUTER_CHAT_MODELS)
			.catch("openai/gpt-4o-mini"),
		MCP_SERVER_URL: z.url().catch("http://localhost:3000/api/mcp"),
		// Public HTTPS URL the bot-link Mini App page is reachable at.
		WEB_BASE_URL: z.url(),
		// This is not used directly, but OpenRouter needs it
		OPENROUTER_API_KEY: z.string(),
	},
	// This is the only place it can be used
	/* oxlint-disable node/no-process-env */
	runtimeEnv: process.env,
	skipValidation: Boolean(process.env.TEST),
	/* oxlint-enable node/no-process-env */
});
