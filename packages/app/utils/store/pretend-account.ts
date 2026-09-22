import { z } from "zod";

import { fallback } from "~app/utils/validation";

export const PRETEND_ACCOUNT_STORE_NAME = "receipt_pretendAccount";

export const pretendAccountSchema = z
	.strictObject({
		email: z.email(),
	})
	.or(fallback<{ email?: string }>(() => ({})));
