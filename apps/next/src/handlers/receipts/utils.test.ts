import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import { insertAccountWithSession } from "@tests/backend/utils/data";
import { expectTRPCError } from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import type { CurrencyCode } from "app/utils/currency";
import {
	MAX_RECEIPT_NAME_LENGTH,
	MIN_RECEIPT_NAME_LENGTH,
} from "app/utils/validation";
import type { ReceiptsId } from "next-app/db/models";
import type { UnauthorizedContext } from "next-app/handlers/context";
import { CURRENCY_CODES } from "next-app/utils/currency";

export const getRandomCurrencyCode = () =>
	faker.helpers.arrayElement(CURRENCY_CODES);

export const getValidReceipt = () => ({
	name: faker.lorem.words(),
	currencyCode: getRandomCurrencyCode(),
	issued: new Date(),
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
				() => runProcedure(context, "a".repeat(MIN_RECEIPT_NAME_LENGTH - 1)),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}name": Minimal length for receipt name is ${MIN_RECEIPT_NAME_LENGTH}`,
			);
		});

		test("maximum length", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, "a".repeat(MAX_RECEIPT_NAME_LENGTH + 1)),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}name": Maximum length for receipt name is ${MAX_RECEIPT_NAME_LENGTH}`,
			);
		});
	});
};

export const verifyCurrencyCode = <T>(
	runProcedure: (
		context: UnauthorizedContext,
		currencyCode: CurrencyCode,
	) => Promise<T>,
	prefix: string,
) => {
	describe("currencyCode", () => {
		test("invalid", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, "foo"),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}currencyCode": Invalid input`,
			);
		});
	});
};

export const verifyIssued = <T>(
	runProcedure: (context: UnauthorizedContext, timestamp: Date) => Promise<T>,
	prefix: string,
) => {
	describe("issued", () => {
		test("not a date", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, new Date("not a date")),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}issued": Invalid date`,
			);
		});
	});
};

export const verifyReceiptId = <T>(
	runProcedure: (
		context: UnauthorizedContext,
		receiptId: ReceiptsId,
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
