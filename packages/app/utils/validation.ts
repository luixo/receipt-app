import { z } from "zod";
import { zfd } from "zod-form-data";

import type { CurrencyCode } from "~app/utils/currency";
import { getValidLocale } from "~app/utils/locale";
import type { AccountsId, UsersId } from "~db/models";

const getLengthMessage = (
	amount: number,
	target: string,
	type: "min" | "max",
) =>
	`${type === "min" ? "Minimal" : "Maximum"} length for ${target} is ${amount}`;
const getMinimalLengthMessage = (min: number, target: string) =>
	getLengthMessage(min, target, "min");
const getMaximumLengthMessage = (max: number, target: string) =>
	getLengthMessage(max, target, "max");

const constrainLength = (
	schema: z.ZodString,
	{ min, max, target }: { min: number; max: number; target: string },
): z.ZodString =>
	schema
		.min(min, { message: getMinimalLengthMessage(min, target) })
		.max(max, { message: getMaximumLengthMessage(max, target) });

export const flavored = <T extends string>(x: string): x is T => true;

export const MAX_LIMIT = 100;
export const MAX_OFFSET = 10 ** 4;

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 255;

export const passwordSchema = constrainLength(z.string(), {
	min: MIN_PASSWORD_LENGTH,
	max: MAX_PASSWORD_LENGTH,
	target: "password",
});

export const MIN_RECEIPT_NAME_LENGTH = 2;
export const MAX_RECEIPT_NAME_LENGTH = 255;

export const receiptNameSchema = constrainLength(z.string(), {
	min: MIN_RECEIPT_NAME_LENGTH,
	max: MAX_RECEIPT_NAME_LENGTH,
	target: "receipt name",
});

export const MIN_RECEIPT_ITEM_NAME_LENGTH = 2;
export const MAX_RECEIPT_ITEM_NAME_LENGTH = 255;

export const receiptItemNameSchema = constrainLength(z.string(), {
	min: MIN_RECEIPT_ITEM_NAME_LENGTH,
	max: MAX_RECEIPT_ITEM_NAME_LENGTH,
	target: "receipt item name",
});

export const MIN_USERNAME_LENGTH = 1;
export const MAX_USERNAME_LENGTH = 255;

export const userNameSchema = constrainLength(z.string(), {
	min: MIN_USERNAME_LENGTH,
	max: MAX_USERNAME_LENGTH,
	target: "user name",
});

export const MAX_SUGGEST_LENGTH = 255;

export const MIN_DEBT_NOTE_LENGTH = 1;
export const MAX_DEBT_NOTE_LENGTH = 255;

export const debtNoteSchema = constrainLength(z.string(), {
	min: MIN_DEBT_NOTE_LENGTH,
	max: MAX_DEBT_NOTE_LENGTH,
	target: "note",
});

export const emailSchema = z
	.string()
	.email({ message: "Invalid email address" });

type NumberSchemaOptions = {
	decimals: number;
	onlyPositive?: boolean;
	nonZero?: boolean;
	max?:
		| number
		| {
				visual: string;
				value: number;
		  };
};

const createNumberSchema = (
	name: string,
	{ decimals, onlyPositive = true, max, nonZero = true }: NumberSchemaOptions,
) => {
	let schema = z
		.number()
		.multipleOf(Number((0.1 ** decimals).toFixed(decimals)), {
			message: `${name} should have at maximum ${decimals} decimals`,
		});
	if (onlyPositive) {
		schema = schema.gte(0, { message: `${name} should be greater than 0` });
	}
	if (max) {
		schema = schema.max(
			typeof max === "number" ? max : max.value,
			`${name} should be less than ${
				typeof max === "number" ? max : max.visual
			}`,
		);
	}
	if (nonZero) {
		return schema.refine((x) => x !== 0, `${name} should be non-zero`);
	}
	return schema;
};

export const priceSchemaDecimal = 2;
export const priceSchema = createNumberSchema("Price", {
	decimals: priceSchemaDecimal,
	max: {
		visual: "10^15",
		value: 10 ** 15 - 1,
	},
});
export const quantitySchemaDecimal = 2;
export const quantitySchema = createNumberSchema("Quantity", {
	decimals: quantitySchemaDecimal,
	max: {
		visual: "1 million",
		value: 10 ** 9,
	},
});
export const partSchemaDecimal = 5;
export const partSchema = createNumberSchema("Part", {
	decimals: partSchemaDecimal,
	max: {
		visual: "1 million",
		value: 10 ** 9,
	},
});
export const debtAmountSchemaDecimal = 2;
export const debtAmountSchema = createNumberSchema("Debt amount", {
	onlyPositive: false,
	decimals: debtAmountSchemaDecimal,
	max: {
		visual: "10^15",
		value: 10 ** 15 - 1,
	},
});

export const currencyCodeSchema = z.string().refine<CurrencyCode>(flavored);

export const currencySchema = z.object({
	code: currencyCodeSchema,
	name: z.string().nonempty(),
	symbol: z.string().nonempty(),
});
export const currencyRateSchemaDecimal = 6;
export const currencyRateSchema = createNumberSchema("Currency rate", {
	decimals: currencyRateSchemaDecimal,
});

export const userIdSchema = z.string().uuid().refine<UsersId>(flavored);
export const accountIdSchema = z.string().uuid().refine<AccountsId>(flavored);

export const fallback = <T>(getValue: () => T) => z.any().transform(getValue);

export const avatarFormSchema = zfd.formData({ avatar: zfd.file().optional() });

export const localeSchema = z.string().transform((value, ctx) => {
	const validLocale = getValidLocale(value);
	if (validLocale) {
		return validLocale;
	}
	ctx.addIssue({
		code: z.ZodIssueCode.custom,
		message: "Not a valid locale",
	});
	return z.NEVER;
});
