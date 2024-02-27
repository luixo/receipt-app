import { z } from "zod";

import { fallback } from "~app/utils/validation";

export const LAST_COLOR_MODE_COOKIE_NAME = "receipt_lastColorMode";
export const SELECTED_COLOR_MODE_COOKIE_NAME = "receipt_selectedColorMode";

export const lastColorModeSchema = z
	.union([z.literal("light"), z.literal("dark")])
	.or(fallback(() => "light" as const));

export const selectedColorModeSchema = lastColorModeSchema
	.optional()
	.or(fallback(() => undefined));

export type ColorMode = z.infer<typeof lastColorModeSchema>;
