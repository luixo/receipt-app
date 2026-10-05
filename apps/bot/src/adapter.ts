import { createOpenRouterText } from "@tanstack/ai-openrouter";

import { env } from "./env";

export const adapter = createOpenRouterText(
	"openai/gpt-6-luna",
	env.OPENROUTER_API_KEY,
);
