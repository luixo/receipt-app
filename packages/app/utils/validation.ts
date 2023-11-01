import { z } from "zod";

import type { CurrencyCode } from "app/utils/currency";
import type { AccountsId, UsersId } from "next-app/db/models";

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
	decimals?: number;
	onlyPositive?: boolean;
	max?:
		| number
		| {
				visual: string;
				value: number;
		  };
};

export const createNumberSchema = (
	name: string,
	{ decimals = 2, onlyPositive = true, max }: NumberSchemaOptions = {},
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
	return schema;
};

export const priceSchema = createNumberSchema("Price", {
	max: {
		visual: "10^15",
		value: 10 ** 15 - 1,
	},
}).refine((x) => x !== 0, `Price should be non-zero`);
export const quantitySchema = createNumberSchema("Quantity", {
	max: {
		visual: "1 million",
		value: 10 ** 9,
	},
}).refine((x) => x !== 0, `Quantity should be non-zero`);
export const partSchema = createNumberSchema("Part", { decimals: 5 });
export const debtAmountSchema = createNumberSchema("Debt amount", {
	onlyPositive: false,
	max: {
		visual: "10^15",
		value: 10 ** 15 - 1,
	},
}).refine((x) => x !== 0, `Debt amount should be non-zero`);

export const currencyCodeSchema = z.string().refine<CurrencyCode>(flavored);

export const currencySchema = z.object({
	code: currencyCodeSchema,
	name: z.string().nonempty(),
	symbol: z.string().nonempty(),
});
export const currencyRateSchema = createNumberSchema("Currency rate", {
	decimals: 6,
});

export const userIdSchema = z.string().uuid().refine<UsersId>(flavored);
export const accountIdSchema = z.string().uuid().refine<AccountsId>(flavored);

// TRPCInfiniteQueryOutput<"users.suggest">["items"][number]
export const userItemSchema = z.strictObject({
	id: userIdSchema,
	name: userNameSchema,
	publicName: userNameSchema.optional(),
	connectedAccount: z
		.strictObject({
			id: accountIdSchema,
			email: z.string().email(),
		})
		.optional(),
});

export const fallback = <T extends z.Schema<unknown>>(
	schema: T,
	value: z.infer<T>,
): T =>
	z.any().transform((val) => {
		const safe = schema.safeParse(val);
		return safe.success ? safe.data : value;
	}) as unknown as T;

export const MIN_BATCH_DEBTS = 1;
export const MAX_BATCH_DEBTS = 10;
