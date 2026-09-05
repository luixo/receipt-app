import { openRouterText } from "@tanstack/ai-openrouter";

import { env } from "./env";

export const adapter = openRouterText(
	env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
);
