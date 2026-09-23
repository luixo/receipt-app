import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		TELEGRAM_BOT_TOKEN: z.string(),
		MCP_SERVER_URL: z.url().catch("http://localhost:3000/api/mcp"),
		// Public HTTPS URL the bot-link Mini App page is reachable at.
		WEB_BASE_URL: z.url(),
		// Ollama credentials
		OLLAMA_URL: z.url(),
		OLLAMA_MODEL: z.string().nonempty(),
		OLLAMA_USER: z.string().nonempty(),
		OLLAMA_PASS: z.string().nonempty(),
	},
	// This is the only place it can be used
	/* oxlint-disable node/no-process-env */
	runtimeEnv: process.env,
	skipValidation: Boolean(process.env.TEST),
	/* oxlint-enable node/no-process-env */
});
