import { z } from "zod";

import type { CurrencyCode } from "#app/utils/currency.ts";
import { flavored } from "#app/utils/validation.ts";
import type { DebtId, ReceiptId, ReceiptItemId, SessionId } from "#db/ids.ts";
import { CURRENCY_CODES } from "#utils/currency-data.ts";

export const assignableRoleSchema = z.literal(["viewer", "editor"]);

export const roleSchema = assignableRoleSchema.or(z.literal("owner"));

export const currencyCodeSchema = flavored<CurrencyCode>(
	z.string().toUpperCase(),
).refine((code) => CURRENCY_CODES.includes(code), {
	params: { i18nKey: "validation.currencyDoesNotExist" },
});

export const receiptIdSchema = flavored<ReceiptId>(z.uuid());
export const receiptItemIdSchema = flavored<ReceiptItemId>(z.uuid());
export const sessionIdSchema = flavored<SessionId>(z.uuid());
export const debtIdSchema = flavored<DebtId>(z.uuid());
export const emailSchema = z.codec(
	z.string().refine((value) => z.email().safeParse(value).success, {
		params: { i18nKey: "validation.invalidEmail" },
	}),
	z.object({ lowercase: z.email(), original: z.email() }),
	{
		decode: (email) => ({ lowercase: email.toLowerCase(), original: email }),
		/* c8 ignore next */
		encode: ({ original }) => original,
	},
);

export const UUID_REGEX =
	/^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

export const MAX_INTENTIONS_AMOUNT = 3;

export { userIdSchema, peerIdSchema } from "#app/utils/validation.ts";
