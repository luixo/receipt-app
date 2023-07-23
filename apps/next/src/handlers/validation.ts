import { z } from "zod";

import { createNumberSchema, flavored, nonZero } from "app/utils/validation";
import {
	UsersId,
	AccountsId,
	ReceiptsId,
	ReceiptItemsId,
	SessionsSessionId,
	DebtsId,
} from "next-app/db/models";
import { isCurrencyCode } from "next-app/utils/currency";

export const offsetSchema = z
	.number()
	.int()
	.gte(0)
	.max(10 ** 4);
export const limitSchema = z.number().int().gt(0).max(100);

export const assignableRoleSchema = z.union([
	z.literal("viewer"),
	z.literal("editor"),
]);

export const roleSchema = assignableRoleSchema.or(z.literal("owner"));

export const currencyCodeSchema = z.string().refine(isCurrencyCode);

// TODO: make narrower
export const localeSchema = z.string();

export const userIdSchema = z.string().uuid().refine<UsersId>(flavored);
export const accountIdSchema = z.string().uuid().refine<AccountsId>(flavored);
export const receiptIdSchema = z.string().uuid().refine<ReceiptsId>(flavored);
export const receiptItemIdSchema = z
	.string()
	.uuid()
	.refine<ReceiptItemsId>(flavored);
export const sessionIdSchema = z
	.string()
	.uuid()
	.refine<SessionsSessionId>(flavored);
export const debtIdSchema = z.string().uuid().refine<DebtsId>(flavored);
export const resetPasswordTokenSchema = z.string().uuid();
export const confirmEmailTokenSchema = z.string().uuid();

export const debtAmountSchema = nonZero(
	createNumberSchema("Debt amount", { onlyPositive: false }),
);

export { flavored };
