import { z } from "zod";

import { Currency } from "app/utils/currency";

const getLengthMessage = (
	amount: number,
	target: string,
	type: "min" | "max"
) =>
	`${type === "min" ? "Minimal" : "Maximum"} length for ${target} is ${amount}`;
const getMinimalLengthMessage = (min: number, target: string) =>
	getLengthMessage(min, target, "min");
const getMaximumLengthMessage = (max: number, target: string) =>
	getLengthMessage(max, target, "max");

const constrainLength = (
	schema: z.ZodString,
	{ min, max, target }: { min: number; max: number; target: string }
): z.ZodString =>
	schema
		.min(min, { message: getMinimalLengthMessage(min, target) })
		.max(max, { message: getMaximumLengthMessage(max, target) });

export const flavored = <T extends string>(x: string): x is T => true;

export const passwordSchema = constrainLength(z.string(), {
	min: 6,
	max: 255,
	target: "password",
});

export const receiptNameSchema = constrainLength(z.string(), {
	min: 2,
	max: 255,
	target: "receipt name",
});

export const receiptItemNameSchema = constrainLength(z.string(), {
	min: 2,
	max: 255,
	target: "receipt item name",
});

export const userNameSchema = constrainLength(z.string(), {
	min: 2,
	max: 255,
	target: "user name",
});

export const debtNoteSchema = constrainLength(z.string(), {
	min: 0,
	max: 255,
	target: "note",
});

export const emailSchema = z
	.string()
	.email({ message: "Invalid email address" });

type NumberSchemaOptions = {
	decimals?: number;
	onlyPositive?: boolean;
};

export const createNumberSchema = (
	name: string,
	{ decimals = 2, onlyPositive = true }: NumberSchemaOptions = {}
) => {
	const schema = z
		.number()
		.multipleOf(Number((0.1 ** decimals).toFixed(decimals)), {
			message: `Part should have at maximum ${decimals} decimals`,
		});
	if (onlyPositive) {
		return schema.gt(0, { message: `${name} should be greater than 0` });
	}
	return schema;
};

export const nonZero = (schema: z.ZodNumber) =>
	schema.refine((value) => value !== 0, "Value should not be zero");

export const priceSchema = createNumberSchema("Price");
export const quantitySchema = createNumberSchema("Quantity");
export const partSchema = createNumberSchema("Part", { decimals: 5 });
export const clientDebtAmountSchema = nonZero(
	createNumberSchema("Debt amount")
);

export const clientCurrencySchema = z.string().refine<Currency>(flavored);

// TRPCQueryOutput<"currency.get-list">["list"][number]
export const currencyObjectSchema = z.object({
	code: clientCurrencySchema,
	name: z.string().nonempty(),
	symbol: z.string().nonempty(),
});

// TRPCInfiniteQueryOutput<"users.get-paged">["items"][number]
export const userObjectSchema = z.object({
	id: z.string().nonempty(),
	name: z.string(),
	publicName: z.union([z.string(), z.null()]),
	email: z.union([z.string(), z.null()]),
});
