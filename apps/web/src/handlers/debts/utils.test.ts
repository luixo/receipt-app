import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import type { CurrencyCode } from "~app/utils/currency";
import {
	MAX_DEBT_NOTE_LENGTH,
	MIN_DEBT_NOTE_LENGTH,
} from "~app/utils/validation";
import type { ReceiptId, UserId } from "~db/ids";
import { createAuthContext } from "~tests/backend/utils/context";
import { insertAccountWithSession } from "~tests/backend/utils/data";
import { expectTRPCError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import type { Temporal } from "~utils/date";
import type { UnauthorizedContext } from "~web/handlers/context";
import { getRandomCurrencyCode } from "~web/handlers/utils.test";

export const getRandomAmount = () =>
	(faker.datatype.boolean() ? 1 : -1) * Number(faker.finance.amount());

export const getValidDebt = (userId: UserId = faker.string.uuid()) => ({
	note: faker.lorem.words(),
	currencyCode: getRandomCurrencyCode(),
	userId,
	amount: Number(faker.finance.amount()) * (faker.datatype.boolean() ? 1 : -1),
});

export const syncedProps = [
	"amount",
	"currencyCode",
	"id",
	"receiptId",
	"timestamp",
] as const;

export const verifyAmount = <T>(
	runProcedure: (context: UnauthorizedContext, amount: number) => Promise<T>,
	prefix: string,
) => {
	describe("amount", () => {
		test("zero", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = await createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, 0),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}amount": Debt amount should be non-zero`,
			);
		});

		test("fraction precision", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = await createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, 1.001),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}amount": Debt amount should have at maximum 2 decimals`,
			);
		});

		test("too big", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = await createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, 10 ** 15),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}amount": Debt amount should be less than 10^15`,
			);
		});
	});
};

export const verifyNote = <T>(
	runProcedure: (context: UnauthorizedContext, note: string) => Promise<T>,
	prefix: string,
) => {
	describe("note", () => {
		test("minimal length", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = await createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, "a".repeat(MIN_DEBT_NOTE_LENGTH - 1)),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}note": Minimal length for note is ${MIN_DEBT_NOTE_LENGTH}`,
			);
		});

		test("maximum length", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = await createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, "a".repeat(MAX_DEBT_NOTE_LENGTH + 1)),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}note": Maximum length for note is ${MAX_DEBT_NOTE_LENGTH}`,
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
			const context = await createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, "foo"),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}currencyCode": Currency does not exist in currency list`,
			);
		});
	});
};

export const verifyTimestamp = <T>(
	runProcedure: (
		context: UnauthorizedContext,
		timestamp: Temporal.PlainDate,
	) => Promise<T>,
	prefix: string,
) => {
	describe("timestamp", () => {
		test("not a date", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = await createAuthContext(ctx, sessionId);
			await expectTRPCError(
				// @ts-expect-error We test an error here
				// eslint-disable-next-line no-restricted-syntax
				() => runProcedure(context, new Date()),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}timestamp": Input not instance of CalendarDate`,
			);
		});
	});
};

export const verifyReceiptId = <T>(
	runProcedure: (
		context: UnauthorizedContext,
		receiptId: ReceiptId,
	) => Promise<T>,
	prefix: string,
) => {
	describe("receiptId", () => {
		test("invalid", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = await createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, "not-a-uuid"),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}receiptId": Invalid UUID`,
			);
		});
	});
};

export const verifyUserId = <T>(
	runProcedure: (context: UnauthorizedContext, userId: UserId) => Promise<T>,
	prefix: string,
) => {
	describe("userId", () => {
		test("invalid", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = await createAuthContext(ctx, sessionId);
			await expectTRPCError(
				() => runProcedure(context, "not-a-valid-uuid"),
				"BAD_REQUEST",
				`Zod error\n\nAt "${prefix}userId": Invalid UUID`,
			);
		});
	});
};
