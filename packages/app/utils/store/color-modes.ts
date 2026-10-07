import { z } from "zod";

import { fallback } from "~app/utils/validation";

export const SYSTEM_COLOR_MODE_STORE_NAME = "receipt_systemColorMode";
export const SELECTED_COLOR_MODE_STORE_NAME = "receipt_selectedColorMode";

export const SystemColorModeSchema = z
	.literal(["light", "dark"])
	.or(fallback(() => "light" as const));

export const selectedColorModeSchema = SystemColorModeSchema.optional().or(
	fallback(() => undefined),
);

export type ColorMode = z.infer<typeof SystemColorModeSchema>;
