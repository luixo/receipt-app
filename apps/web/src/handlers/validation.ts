import { z } from "zod";

import type { CurrencyCode } from "~app/utils/currency";
import { flavored } from "~app/utils/validation";
import type { DebtId, ReceiptId, ReceiptItemId, SessionId } from "~db/ids";
import { CURRENCY_CODES } from "~utils/currency-data";

export const assignableRoleSchema = z.literal(["viewer", "editor"]);

export const roleSchema = assignableRoleSchema.or(z.literal("owner"));

export const currencyCodeSchema = flavored<CurrencyCode>(
	z.string().toUpperCase(),
	"currency code",
).refine((code) => CURRENCY_CODES.includes(code), {
	error: `Currency does not exist in currency list`,
});

export const receiptIdSchema = flavored<ReceiptId>(z.uuid(), "receipt id");
export const receiptItemIdSchema = flavored<ReceiptItemId>(
	z.uuid(),
	"receipt item id",
);
export const sessionIdSchema = flavored<SessionId>(z.uuid(), "session id");
export const debtIdSchema = flavored<DebtId>(z.uuid(), "debt id");
export const emailSchema = z.codec(
	z.email({ message: "Invalid email address" }),
	z.object({ lowercase: z.email(), original: z.email() }),
	{
		decode: (email) => ({ lowercase: email.toLowerCase(), original: email }),
		encode: ({ original }) => original,
	},
);

export const UUID_REGEX =
	/^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

export const MAX_INTENTIONS_AMOUNT = 3;

export { accountIdSchema, userIdSchema } from "~app/utils/validation";
