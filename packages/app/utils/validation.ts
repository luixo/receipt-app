import { z } from "zod";
import { zfd } from "zod-form-data";

import type { CurrencyCode } from "#app/utils/currency.ts";
import { VALID_LOCALES, getValidLocale } from "#app/utils/locale.ts";
import type { PeerId, UserId } from "#db/ids.ts";

const constrainLength = (
	schema: z.ZodString,
	{ min, max, target }: { min: number; max: number; target: string },
): z.ZodString =>
	schema
		.refine((value) => Array.from(value).length >= min, {
			params: { i18nKey: "validation.minLength", target, amount: min },
		})
		.refine((value) => Array.from(value).length <= max, {
			params: { i18nKey: "validation.maxLength", target, amount: max },
		});

export const flavored = <X extends string>(out: z.ZodType<X>) =>
	z.codec(z.string(), out, {
		decode: (val) => val as X,
		encode: (val) => val as string,
	});

export const MAX_LIMIT = 100;
export const MAX_OFFSET = 10 ** 4;

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 255;

export const passwordSchema = constrainLength(z.string(), {
	min: MIN_PASSWORD_LENGTH,
	max: MAX_PASSWORD_LENGTH,
	target: "validation.fields.password",
});

export const MIN_RECEIPT_NAME_LENGTH = 2;
export const MAX_RECEIPT_NAME_LENGTH = 255;

export const receiptNameSchema = constrainLength(z.string(), {
	min: MIN_RECEIPT_NAME_LENGTH,
	max: MAX_RECEIPT_NAME_LENGTH,
	target: "validation.fields.receiptName",
});

export const MIN_RECEIPT_ITEM_NAME_LENGTH = 2;
export const MAX_RECEIPT_ITEM_NAME_LENGTH = 255;

export const receiptItemNameSchema = constrainLength(z.string(), {
	min: MIN_RECEIPT_ITEM_NAME_LENGTH,
	max: MAX_RECEIPT_ITEM_NAME_LENGTH,
	target: "validation.fields.receiptItemName",
});

export const MIN_USERNAME_LENGTH = 1;
export const MAX_USERNAME_LENGTH = 255;

export const peerNameSchema = constrainLength(z.string(), {
	min: MIN_USERNAME_LENGTH,
	max: MAX_USERNAME_LENGTH,
	target: "validation.fields.peerName",
});

export const MIN_QUERY_LENGTH = 3;
export const MAX_QUERY_LENGTH = 255;

export const MIN_DEBT_NOTE_LENGTH = 1;
export const MAX_DEBT_NOTE_LENGTH = 255;

export const debtNoteSchema = constrainLength(z.string(), {
	min: MIN_DEBT_NOTE_LENGTH,
	max: MAX_DEBT_NOTE_LENGTH,
	target: "validation.fields.note",
});

export const emailSchema = z
	.string()
	.refine((value) => z.email().safeParse(value).success, {
		params: { i18nKey: "validation.invalidEmail" },
	});

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

const createNumberSchema = ({
	name,
	decimals,
	onlyPositive = true,
	max,
	nonZero = true,
}: NumberSchemaOptions & { name: string }) => {
	const divisor = Number((0.1 ** decimals).toFixed(decimals));
	const decimalSchema = z.float32().multipleOf(divisor);
	let schema = z
		.float32()
		.refine((value) => decimalSchema.safeParse(value).success, {
			params: { i18nKey: "validation.maxDecimals", target: name, decimals },
		});
	if (onlyPositive) {
		schema = schema.refine((value) => value >= 0, {
			params: { i18nKey: "validation.greaterThanZero", target: name },
		});
	}
	if (max) {
		schema = schema.refine(
			(value) => value <= (typeof max === "number" ? max : max.value),
			{
				params: {
					i18nKey: "validation.lessThan",
					target: name,
					maximum: typeof max === "number" ? max : max.visual,
				},
			},
		);
	}
	if (nonZero) {
		return schema.refine((x) => x !== 0, {
			params: { i18nKey: "validation.nonZero", target: name },
		});
	}
	return schema;
};

export const priceSchemaDecimal = 2;
export const priceSchema = createNumberSchema({
	name: "validation.fields.price",
	decimals: priceSchemaDecimal,
	max: {
		visual: "10^15",
		value: 10 ** 15 - 1,
	},
});
export const quantitySchemaDecimal = 2;
export const quantitySchema = createNumberSchema({
	name: "validation.fields.quantity",
	decimals: quantitySchemaDecimal,
	max: {
		visual: "1 million",
		value: 10 ** 9,
	},
});
export const partSchemaDecimal = 5;
export const partSchema = createNumberSchema({
	name: "validation.fields.part",
	decimals: partSchemaDecimal,
	max: {
		visual: "1 million",
		value: 10 ** 9,
	},
});
export const debtAmountSchemaDecimal = 2;
export const debtAmountSchema = createNumberSchema({
	name: "validation.fields.debtAmount",
	onlyPositive: false,
	decimals: debtAmountSchemaDecimal,
	max: {
		visual: "10^15",
		value: 10 ** 15 - 1,
	},
});

export const currencyCodeSchema = flavored<CurrencyCode>(
	z.string().toUpperCase(),
);

export const currencySchema = z.object({
	code: currencyCodeSchema,
	name: z.string().nonempty(),
	symbol: z.string().nonempty(),
});
export const currencyRateSchemaDecimal = 6;
export const currencyRateSchema = createNumberSchema({
	name: "validation.fields.currencyRate",
	decimals: currencyRateSchemaDecimal,
});

export const peerIdSchema = flavored<PeerId>(z.uuid());
export const userIdSchema = flavored<UserId>(z.uuid());

export const fallback = <T>(getValue: () => T) => z.any().transform(getValue);

export const avatarFormSchema = zfd.formData({ avatar: zfd.file().optional() });

export const localeSchema = z.string().transform((value, ctx) => {
	const validLocale = getValidLocale(value);
	if (validLocale) {
		return validLocale;
	}
	ctx.addIssue({
		code: "invalid_value",
		input: validLocale,
		values: VALID_LOCALES,
	});
	return z.NEVER;
});

export const resetPasswordTokenSchema = z.uuid();
export const confirmEmailTokenSchema = z.uuid();
export const voidUserTokenSchema = z.uuid();

export const offsetSchema = z.int().gte(0).max(MAX_OFFSET);
export const limitSchema = z.int().gt(0).max(MAX_LIMIT);
export const directionSchema = z.enum(["forward", "backward"]);

export const queryNoMinSchema = z.string().max(MAX_QUERY_LENGTH);
export const querySchema = queryNoMinSchema.min(MIN_QUERY_LENGTH);

export const receiptsFiltersSchema = z.strictObject({
	ownedByMe: z.boolean().optional(),
	query: querySchema.optional(),
});
export const receiptsOrderBySchema = z.enum(["date-asc", "date-desc"]);

export const debtsFiltersSchema = z.strictObject({
	showResolved: z.boolean().optional(),
});
export const debtsByPeerFiltersSchema = z.strictObject({
	showResolved: z.boolean().optional(),
});

export const DEFAULT_LIMIT = 10;
export const LIMITS = [DEFAULT_LIMIT, 25, 50, 100];
