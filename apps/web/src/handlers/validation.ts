import { z } from "zod";

import type { CurrencyCode } from "~app/utils/currency";
import { flavored } from "~app/utils/validation";
import type { DebtId, ReceiptId, ReceiptItemId, SessionId } from "~db/ids";
import { CURRENCY_CODES } from "~utils/currency-data";

export const assignableRoleSchema = z.literal(["viewer", "editor"]);

export const roleSchema = assignableRoleSchema.or(z.literal("owner"));

export const currencyCodeSchema = z
	.string()
	.overwrite((code) => code.toUpperCase())
	.refine((code) => CURRENCY_CODES.includes(code), {
		error: `Currency does not exist in currency list`,
	})
	.transform<CurrencyCode>(flavored);

export const receiptIdSchema = z.uuid().transform<ReceiptId>(flavored);
export const receiptItemIdSchema = z.uuid().transform<ReceiptItemId>(flavored);
export const sessionIdSchema = z.uuid().transform<SessionId>(flavored);
export const debtIdSchema = z.uuid().transform<DebtId>(flavored);
export const emailSchema = z
	.email({ message: "Invalid email address" })
	.transform((email) => ({ lowercase: email.toLowerCase(), original: email }));

export const UUID_REGEX =
	/^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

export const MAX_INTENTIONS_AMOUNT = 3;

export { accountIdSchema, userIdSchema } from "~app/utils/validation";
