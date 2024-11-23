import { z } from "zod";

import { fallback } from "~app/utils/validation";

export const PRETEND_USER_STORE_NAME = "receipt_pretendUser";

export const pretendUserSchema = z
	.strictObject({
		email: z.string().email(),
	})
	.or(fallback<{ email?: string }>(() => ({})));
