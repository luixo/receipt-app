import { createOllamaChat } from "@tanstack/ai-ollama";

import { env } from "./env";

export const adapter = createOllamaChat(env.OLLAMA_MODEL, {
	baseURL: env.OLLAMA_URL,
	defaultHeaders: {
		Authorization: `Basic ${Buffer.from(
			`${env.OLLAMA_USER}:${env.OLLAMA_PASS}`,
		).toString("base64")}`,
	},
});
