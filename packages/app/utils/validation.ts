import { z } from "zod";

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

export const accountNameSchema = constrainLength(z.string(), {
	min: 2,
	max: 255,
	target: "account name",
});

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

export const emailSchema = z
	.string()
	.email({ message: "Invalid email address" });

export const priceSchema = z
	.number()
	.gt(0, { message: "Price should be greater than 0" });

export const quantitySchema = z
	.number()
	.gt(0, { message: "Quantity should be greater than 0" });

export const partSchema = z
	.number()
	.gt(0, { message: "Part should be greater than 0" });

export const parseNumberWithDecimals = (
	value: string,
	decimals = 2
): number | string | undefined => {
	const output = Number(value);
	const stringifiedOutput = output.toString().split(".");
	if (Number.isNaN(output) || (stringifiedOutput[1]?.length ?? 0) > decimals) {
		return;
	}
	return value === "" ? value : output;
};
