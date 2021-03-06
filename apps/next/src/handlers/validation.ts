import { z } from "zod";

import {
	UsersId,
	AccountsId,
	ReceiptsId,
	ReceiptItemsId,
	SessionsId,
} from "next-app/db/models";
import { isCurrency } from "next-app/utils/currency";

export const flavored = <T extends string>(x: string): x is T => true;

export const limitSchema = z.number().int().gt(0).max(100);

export const assignableRoleSchema = z.union([
	z.literal("viewer"),
	z.literal("editor"),
]);

export const roleSchema = assignableRoleSchema.or(z.literal("owner"));

export const currencySchema = z.string().refine(isCurrency);

// TODO: make narrower
export const localeSchema = z.string();

export const userIdSchema = z.string().uuid().refine<UsersId>(flavored);
export const accountIdSchema = z.string().uuid().refine<AccountsId>(flavored);
export const receiptIdSchema = z.string().uuid().refine<ReceiptsId>(flavored);
export const receiptItemIdSchema = z
	.string()
	.uuid()
	.refine<ReceiptItemsId>(flavored);
export const sessionIdSchema = z.string().uuid().refine<SessionsId>(flavored);
export const resetPasswordTokenSchema = z.string().uuid();
export const confirmEmailTokenSchema = z.string().uuid();
