import { VALIDATIONS_CONSTANTS } from "app/utils/validation";
import { z } from "zod";
import { isCurrency } from "../utils/currency";

export const password = z
	.string()
	.min(VALIDATIONS_CONSTANTS.accountPassword.min)
	.max(VALIDATIONS_CONSTANTS.accountPassword.max);
export const name = z
	.string()
	.min(VALIDATIONS_CONSTANTS.accountName.min)
	.max(VALIDATIONS_CONSTANTS.accountName.min);

export const flavored = <T extends string>(x: string): x is T => true;

export const assignableRole = z.union([
	z.literal("viewer"),
	z.literal("editor"),
]);

export const role = assignableRole.or(z.literal("owner"));

export const currency = z.string().refine(isCurrency);
