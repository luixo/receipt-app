import { createOpenRouterText } from "@tanstack/ai-openrouter";

import { env } from "./env";

export const adapter = createOpenRouterText(
	env.OPENROUTER_MODEL,
	env.OPENROUTER_API_KEY,
);
