import { z } from "zod/v4";

import { fallback } from "~app/utils/validation";

export const PRETEND_USER_STORE_NAME = "receipt_pretendUser";

export const pretendUserSchema = z
	.strictObject({
		email: z.email(),
	})
	.or(fallback<{ email?: string }>(() => ({})));
