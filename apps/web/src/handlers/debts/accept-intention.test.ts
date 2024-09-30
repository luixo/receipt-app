import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountSettings,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertReceipt,
	insertSyncedDebts,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./accept-intention";
import { getRandomCurrencyCode } from "./utils.test";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debts.acceptIntention", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ id: faker.string.uuid() }),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ id: "not-a-valid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid uuid`,
				);
			});
		});

		test("debt does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			// Verify that other debts don't affect the result
			await insertDebt(ctx, accountId, userId);

			const fakeDebtId = faker.string.uuid();
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: fakeDebtId }),
				"NOT_FOUND",
				`Intention for debt "${fakeDebtId}" is not found.`,
			);
		});

		test("attempt to accept an old debt", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const [{ id: debtId }] = await insertSyncedDebts(
				ctx,
				[accountId, userId],
				[foreignAccountId, foreignToSelfUserId],
				{ ahead: "our" },
			);

			// Verify that other debts don't affect the result
			await insertDebt(ctx, accountId, userId);
			await insertDebt(ctx, accountId, foreignToSelfUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: debtId }),
				"FORBIDDEN",
				`The counterparty is intended to accept debt "${debtId}" as our timestamp is more fresh.`,
			);
		});
	});

	describe("functionality", () => {
		test("debt is synced - created", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			const { id: foreignDebtId } = await insertDebt(
				ctx,
				foreignAccountId,
				foreignToSelfUserId,
				{
					createdAt: new Date("2020-05-01"),
					receiptId: foreignReceiptId,
				},
			);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			await insertAccountSettings(ctx, accountId, { manualAcceptDebts: true });
			const { id: anotherForeignUserId } = await insertUser(
				ctx,
				foreignAccountId,
			);
			await insertDebt(ctx, accountId, userId);
			await insertDebt(ctx, foreignAccountId, anotherForeignUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: foreignDebtId }),
			);
			expect(result).toStrictEqual<typeof result>({ createdAt: new Date() });
		});

		test("debt is synced - updated", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			const [debt] = await insertSyncedDebts(
				ctx,
				[accountId, userId],
				[foreignAccountId, foreignToSelfUserId],
				{
					fn: (originalDebt) => ({
						...originalDebt,
						currencyCode: getRandomCurrencyCode(),
						amount: Number(faker.finance.amount()),
						timestamp: new Date("2020-04-01"),
						createdAt: new Date("2020-05-01"),
						note: faker.lorem.words(),
						receiptId: foreignReceiptId,
					}),
					ahead: "their",
				},
			);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			const { id: anotherForeignUserId } = await insertUser(
				ctx,
				foreignAccountId,
			);
			await insertDebt(ctx, accountId, userId);
			await insertDebt(ctx, foreignAccountId, anotherForeignUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: debt.id }),
			);
			expect(result).toStrictEqual<typeof result>({
				createdAt: debt.createdAt,
			});
		});
	});
});
