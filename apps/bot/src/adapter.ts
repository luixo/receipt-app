import { createOpenRouterText } from "@tanstack/ai-openrouter";

import { env } from "./env";

export const adapter = createOpenRouterText(
	"anthropic/claude-sonnet-4",
	env.OPENROUTER_API_KEY,
);
