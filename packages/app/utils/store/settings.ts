import { z } from "zod/v4";

import { fallback } from "~app/utils/validation";

export const SETTINGS_STORE_NAME = "receipt_settings";

export const settingsSchema = z
	.object({
		showResolvedDebts: z.boolean().or(fallback(() => false)),
	})
	.or(fallback(() => ({ showResolvedDebts: false })));
