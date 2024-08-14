import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import {
	MAX_RECEIPT_ITEM_NAME_LENGTH,
	MIN_RECEIPT_ITEM_NAME_LENGTH,
} from "~app/utils/validation";
import type { ReceiptItemsId } from "~db/models";
import { createAuthContext } from "~tests/backend/utils/context";
import { insertAccountWithSession } from "~tests/backend/utils/data";
import { expectTRPCError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import type { UnauthorizedContext } from "~web/handlers/context";

export const getValidReceiptItem = (receiptId = faker.string.uuid()) => ({
	receiptId,
	name: faker.lorem.words(),
	price: Number(faker.finance.amount()),
	quantity: faker.number.int({ max: 100 }),
});

export const verifyName = <T>(
	runProcedure: (context: UnauthorizedContext, name: string) => Promise<T>,
	prefix: string,
) => {
	describe("name", () => {
		test("minimal length", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() =>
					runProcedure(context, "a".repeat(MIN_RECEIPT_ITEM_NAME_LENGTH - 1)),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}name": Minimal length for receipt item name is ${MIN_RECEIPT_ITEM_NAME_LENGTH}`,
			);
		});

		test("maximum length", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() =>
					runProcedure(context, "a".repeat(MAX_RECEIPT_ITEM_NAME_LENGTH + 1)),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}name": Maximum length for receipt item name is ${MAX_RECEIPT_ITEM_NAME_LENGTH}`,
			);
		});
	});
};

export const verifyPrice = <T>(
	runProcedure: (context: UnauthorizedContext, price: number) => Promise<T>,
	prefix: string,
) => {
	describe("price", () => {
		test("negative", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, -1),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}price": Price should be greater than 0`,
			);
		});

		test("zero", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, 0),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}price": Price should be non-zero`,
			);
		});

		test("fraction precision", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, 1.001),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}price": Price should have at maximum 2 decimals`,
			);
		});

		test("too big", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, 10 ** 15),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}price": Price should be less than 10^15`,
			);
		});
	});
};

export const verifyQuantity = <T>(
	runProcedure: (context: UnauthorizedContext, quantity: number) => Promise<T>,
	prefix: string,
) => {
	describe("quantity", () => {
		test("negative", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, -1),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}quantity": Quantity should be greater than 0`,
			);
		});

		test("zero", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, 0),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}quantity": Quantity should be non-zero`,
			);
		});

		test("fraction precision", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, 1.001),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}quantity": Quantity should have at maximum 2 decimals`,
			);
		});

		test("too big", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, 10 ** 9 + 1),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}quantity": Quantity should be less than 1 million`,
			);
		});
	});
};

export const verifyReceiptItemId = <T>(
	runProcedure: (
		context: UnauthorizedContext,
		receiptItemId: ReceiptItemsId,
	) => Promise<T>,
	prefix: string,
) => {
	describe("id", () => {
		test("invalid", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, "not-a-valid-uuid"),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}id": Invalid uuid`,
			);
		});
	});
};
