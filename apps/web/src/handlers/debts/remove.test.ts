import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountSettings,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
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

import { procedure } from "./remove";

const router = t.router({ procedure });

describe("debts.remove", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({ id: faker.string.uuid() }),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ id: "not-a-valid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid uuid`,
				);
			});
		});

		test("debt does not exist", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);
			// Verify that other debts don't affect the result
			await insertDebt(ctx, accountId, userId);
			const fakeDebtId = faker.string.uuid();
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: fakeDebtId }),
				"NOT_FOUND",
				`No debt found by id "${fakeDebtId}" on account "${email}"`,
			);
		});

		test("debt is not owned by an account", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			// Verify that other debts don't affect the result
			const { id: userId } = await insertUser(ctx, accountId);
			await insertDebt(ctx, accountId, userId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
			const { id: debtId } = await insertDebt(
				ctx,
				foreignAccountId,
				foreignUserId,
			);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: debtId }),
				"NOT_FOUND",
				`No debt found by id "${debtId}" on account "${email}"`,
			);
		});
	});

	describe("functionality", () => {
		test("not auto-accepted by counterparty", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx, {
				settings: { manualAcceptDebts: true },
			});
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const [{ id: debtId }] = await insertSyncedDebts(
				ctx,
				[accountId, userId],
				[foreignAccountId, foreignToSelfUserId],
			);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			await insertAccountSettings(ctx, accountId, { manualAcceptDebts: true });
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
			await insertDebt(ctx, accountId, userId);
			await insertDebt(ctx, foreignAccountId, foreignUserId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: debtId }),
			);
			expect(result).toStrictEqual<typeof result>({ reverseRemoved: false });
		});

		describe("auto-accepted by counterparty", () => {
			test("debt exists", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: foreignUserId }, { id: foreignToSelfUserId }] =
					await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
				const [{ id: debtId }] = await insertSyncedDebts(
					ctx,
					[accountId, foreignUserId],
					[foreignAccountId, foreignToSelfUserId],
				);

				// Verify unrelated data doesn't affect the result
				await insertUser(ctx, accountId);
				await insertAccountSettings(ctx, accountId, {
					manualAcceptDebts: true,
				});
				await insertUser(ctx, foreignAccountId);
				await insertDebt(ctx, accountId, foreignUserId);
				await insertDebt(ctx, foreignAccountId, foreignToSelfUserId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ id: debtId }),
				);
				expect(result).toStrictEqual<typeof result>({ reverseRemoved: true });
			});

			test("debt does not exist", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: foreignUserId }, { id: foreignToSelfUserId }] =
					await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
				const debt = await insertDebt(ctx, accountId, foreignUserId);

				// Verify unrelated data doesn't affect the result
				await insertUser(ctx, accountId);
				await insertAccountSettings(ctx, accountId, {
					manualAcceptDebts: true,
				});
				await insertUser(ctx, foreignAccountId);
				await insertDebt(ctx, accountId, foreignUserId);
				await insertDebt(ctx, foreignAccountId, foreignToSelfUserId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ id: debt.id }),
				);
				expect(result).toStrictEqual<typeof result>({ reverseRemoved: false });
			});
		});
	});
});
