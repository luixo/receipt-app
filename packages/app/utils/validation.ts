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

const createNumberSchema = (name: string, decimals = 2) =>
	z
		.number()
		.gt(0, { message: `${name} should be greater than 0` })
		.multipleOf(Number((0.1 ** decimals).toFixed(decimals)), {
			message: `Part should have at maximum ${decimals} decimals`,
		});

export const priceSchema = createNumberSchema("Price");
export const quantitySchema = createNumberSchema("Quantity");
export const partSchema = createNumberSchema("Part", 5);
