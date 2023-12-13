import { z } from "zod";

import { fallback } from "app/utils/validation";

export const SETTINGS_COOKIE_NAME = "receipt_settings";

export const settingsSchema = z
	.object({
		showResolvedDebts: z.boolean().or(fallback(() => false)),
	})
	.or(fallback(() => ({ showResolvedDebts: false })));
