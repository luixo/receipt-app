import { z } from "zod/v4";

import {
	MAX_LIMIT,
	MAX_OFFSET,
	accountIdSchema,
	flavored,
	userIdSchema,
} from "~app/utils/validation";
import type {
	DebtsId,
	ReceiptItemsId,
	ReceiptsId,
	SessionsSessionId,
} from "~db/models";
import { CURRENCY_CODES } from "~utils/currency-data";

export const offsetSchema = z.int().gte(0).max(MAX_OFFSET);
export const limitSchema = z.int().gt(0).max(MAX_LIMIT);

export const assignableRoleSchema = z.literal(["viewer", "editor"]);

export const roleSchema = assignableRoleSchema.or(z.literal("owner"));

export const currencyCodeSchema = z
	.string()
	.overwrite((code) => code.toUpperCase())
	.refine((code) => CURRENCY_CODES.includes(code), {
		error: `Currency does not exist in currency list`,
	});

export const receiptIdSchema = z.uuid().transform<ReceiptsId>(flavored);
export const receiptItemIdSchema = z.uuid().transform<ReceiptItemsId>(flavored);
export const sessionIdSchema = z.uuid().transform<SessionsSessionId>(flavored);
export const debtIdSchema = z.uuid().transform<DebtsId>(flavored);
export const resetPasswordTokenSchema = z.uuid();
export const confirmEmailTokenSchema = z.uuid();
export const emailSchema = z
	.email({ message: "Invalid email address" })
	.transform((email) => ({ lowercase: email.toLowerCase(), original: email }));

export const UUID_REGEX =
	/^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

export const MAX_INTENTIONS_AMOUNT = 3;

export { userIdSchema, accountIdSchema };
