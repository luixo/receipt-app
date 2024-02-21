import { faker } from "@faker-js/faker";
import { assert, describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertReceipt,
	insertSyncedDebts,
	insertUser,
} from "@tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import type { TestContext } from "@tests/backend/utils/test";
import { test } from "@tests/backend/utils/test";
import type { TRPCMutationInput } from "app/trpc";
import { nonNullishGuard, pick } from "app/utils/utils";
import type { AccountsId, UsersId } from "next-app/db/models";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./update-batch";
import {
	getRandomAmount,
	getRandomCurrencyCode,
	syncedProps,
	verifyAmount,
	verifyCurrencyCode,
	verifyNote,
	verifyReceiptId,
	verifyTimestamp,
} from "./utils.test";

const router = t.router({ procedure });

const updateDescribes = (
	getUpdates: (opts: {
		ctx: TestContext;
		selfAccountId: AccountsId;
		defaultDebt: Awaited<ReturnType<typeof insertDebt>>;
		defaultUserId: UsersId;
	}) => Promise<{
		updates: TRPCMutationInput<"debts.updateBatch">;
		debts?: Awaited<ReturnType<typeof insertDebt>>[];
	}>,
	getNextTimestamp: (opts: {
		update: TRPCMutationInput<"debts.updateBatch">[number];
		debt: Awaited<ReturnType<typeof insertDebt>>;
	}) => Date | null | undefined,
) => {
	const runTest = async ({
		ctx,
		lockedBefore,
		counterPartyAccepts,
		counterPartyExists,
	}: {
		ctx: TestContext;
		lockedBefore: boolean;
		counterPartyAccepts: boolean;
		counterPartyExists: boolean;
	}) => {
		const { sessionId, accountId } = await insertAccountWithSession(ctx);
		const { id: foreignAccountId } = await insertAccount(
			ctx,
			counterPartyAccepts ? { settings: { autoAcceptDebts: true } } : undefined,
		);
		const [{ id: userId }, { id: foreignToSelfUserId }] =
			await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
		let debt: Awaited<ReturnType<typeof insertDebt>>;
		if (counterPartyExists) {
			const [syncedDebt] = await insertSyncedDebts(
				ctx,
				[
					accountId,
					userId,
					lockedBefore
						? { lockedTimestamp: new Date("2021-01-01") }
						: undefined,
				],
				[foreignAccountId, foreignToSelfUserId],
			);
			debt = syncedDebt;
		} else {
			const unsyncedDebt = await insertDebt(
				ctx,
				accountId,
				userId,
				lockedBefore ? { lockedTimestamp: new Date("2021-01-01") } : undefined,
			);
			debt = unsyncedDebt;
		}

		// Verify unrelated data doesn't affect the result
		await insertUser(ctx, accountId);
		await insertUser(ctx, foreignAccountId);
		const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
		await insertDebt(ctx, accountId, userId);
		await insertDebt(ctx, foreignAccountId, foreignUserId);

		const { updates, debts = [] } = await getUpdates({
			ctx,
			selfAccountId: accountId,
			defaultDebt: debt,
			defaultUserId: userId,
		});

		const caller = router.createCaller(createAuthContext(ctx, sessionId));
		const result = await expectDatabaseDiffSnapshot(ctx, () =>
			caller.procedure(updates),
		);
		expect(result).toStrictEqual<typeof result>(
			updates
				.map((update) => {
					const matchedDebt = [debt, ...debts].find(
						({ id }) => id === update.id,
					);
					if (!matchedDebt) {
						throw new Error(`You should pass a debt with id ${debt.id}.`);
					}
					const nextLockedTimestamp = getNextTimestamp({
						debt: matchedDebt,
						update,
					});
					if (nextLockedTimestamp === undefined) {
						return null;
					}
					const reverseLockedTimestampUpdated =
						(nextLockedTimestamp !== undefined && counterPartyAccepts) ||
						!counterPartyExists;
					return {
						debtId: update.id,
						lockedTimestamp: nextLockedTimestamp,
						reverseLockedTimestampUpdated,
					};
				})
				.filter(nonNullishGuard),
		);
		return {
			debtId: debt.id,
			selfAccountId: accountId,
			foreignAccountId,
		};
	};

	const lockedStateTests = ({
		counterPartyAccepts,
	}: {
		counterPartyAccepts: boolean;
	}) => {
		test("locked before update", async ({ ctx }) => {
			await runTest({
				ctx,
				lockedBefore: true,
				counterPartyAccepts,
				counterPartyExists: true,
			});
		});
		test("unlocked before update", async ({ ctx }) => {
			await runTest({
				ctx,
				lockedBefore: false,
				counterPartyAccepts,
				counterPartyExists: true,
			});
		});
		if (counterPartyAccepts) {
			test("debt didn't exist beforehand", async ({ ctx }) => {
				const { debtId, selfAccountId, foreignAccountId } = await runTest({
					ctx,
					lockedBefore: false,
					counterPartyAccepts,
					counterPartyExists: false,
				});
				const debts = await ctx.database
					.selectFrom("debts")
					.where((eb) => eb.and({ id: debtId }))
					.selectAll()
					.execute();

				const selfDebt = debts.find(
					(debt) => debt.ownerAccountId === selfAccountId,
				);
				assert(selfDebt, "Self debt does not exist");
				const pickedSelfDebt = pick(selfDebt, syncedProps);

				const foreignDebt = debts.find(
					(debt) => debt.ownerAccountId === foreignAccountId,
				);
				assert(foreignDebt, "Foreign debt does not exist");
				const pickedForeignDebt = pick(foreignDebt, syncedProps);

				expect(pickedSelfDebt).toStrictEqual<typeof pickedSelfDebt>({
					...pickedForeignDebt,
					amount: (-pickedForeignDebt.amount).toFixed(4),
				});
			});
		}
	};

	describe("counterparty doesn't auto-accept", () => {
		lockedStateTests({ counterPartyAccepts: false });
	});

	describe("counterparty auto-accepts", () => {
		lockedStateTests({ counterPartyAccepts: true });
	});
};

describe("debts.updateBatch", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure([
				{
					id: faker.string.uuid(),
					update: { amount: getRandomAmount() },
				},
			]),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure([
							{
								id: "not-a-valid-uuid",
								update: {
									amount: getRandomAmount(),
								},
							},
						]),
					"BAD_REQUEST",
					`Zod error\n\nAt "[0].id": Invalid uuid`,
				);
			});
		});

		describe("update", () => {
			test("should have at least one key", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure([
							{
								id: faker.string.uuid(),
								update: {},
							},
						]),
					"BAD_REQUEST",
					`Zod error\n\nAt "[0].update": Update object has to have at least one key to update`,
				);
			});
		});

		verifyAmount(
			(context, amount) =>
				router.createCaller(context).procedure([
					{
						id: faker.string.uuid(),
						update: { amount },
					},
				]),
			"[0].update.",
		);

		verifyNote(
			(context, note) =>
				router.createCaller(context).procedure([
					{
						id: faker.string.uuid(),
						update: { note },
					},
				]),
			"[0].update.",
		);

		verifyCurrencyCode(
			(context, currencyCode) =>
				router.createCaller(context).procedure([
					{
						id: faker.string.uuid(),
						update: { currencyCode },
					},
				]),
			"[0].update.",
		);

		verifyTimestamp(
			(context, timestamp) =>
				router.createCaller(context).procedure([
					{
						id: faker.string.uuid(),
						update: { timestamp },
					},
				]),
			"[0].update.",
		);

		verifyReceiptId(
			(context, receiptId) =>
				router.createCaller(context).procedure([
					{
						id: faker.string.uuid(),
						update: { receiptId },
					},
				]),
			"[0].update.",
		);

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
			const anotherFakeDebtId = faker.string.uuid();
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure([
						{
							id: fakeDebtId,
							update: { amount: getRandomAmount() },
						},
						{
							id: anotherFakeDebtId,
							update: { amount: getRandomAmount() },
						},
					]),
				"NOT_FOUND",
				`Debts "${fakeDebtId}", "${anotherFakeDebtId}" do not exist on account "${email}".`,
			);
		});

		test("debt is not owned by an account", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				account: { email },
			} = await insertAccountWithSession(ctx);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
			const { id: debtId } = await insertDebt(
				ctx,
				foreignAccountId,
				foreignUserId,
			);

			// Verify that other debts don't affect the result
			const { id: userId } = await insertUser(ctx, accountId);
			await insertDebt(ctx, accountId, userId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure([
						{
							id: debtId,
							update: { amount: getRandomAmount() },
						},
					]),
				"NOT_FOUND",
				`Debt "${debtId}" does not exist on account "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		describe("no locked", () => {
			updateDescribes(
				async ({ defaultDebt, selfAccountId, ctx }) => {
					const { id: receiptId } = await insertReceipt(ctx, selfAccountId);
					return {
						updates: [
							{
								id: defaultDebt.id,
								update: {
									amount: getRandomAmount(),
									timestamp: new Date("2020-06-01"),
									note: faker.lorem.words(),
									currencyCode: getRandomCurrencyCode(),
									receiptId,
								},
							},
						],
					};
				},
				({ debt }) => (debt.lockedTimestamp ? new Date() : undefined),
			);
		});

		describe("locked as true", () => {
			updateDescribes(
				async ({ defaultDebt, selfAccountId, ctx }) => {
					const { id: receiptId } = await insertReceipt(ctx, selfAccountId);
					return {
						updates: [
							{
								id: defaultDebt.id,
								update: {
									amount: getRandomAmount(),
									timestamp: new Date("2020-06-01"),
									note: faker.lorem.words(),
									currencyCode: getRandomCurrencyCode(),
									receiptId,
									locked: true,
								},
							},
						],
					};
				},
				() => new Date(),
			);
		});

		describe("locked as false", () => {
			updateDescribes(
				async ({ defaultDebt, selfAccountId, ctx }) => {
					const { id: receiptId } = await insertReceipt(ctx, selfAccountId);
					return {
						updates: [
							{
								id: defaultDebt.id,
								update: {
									amount: getRandomAmount(),
									timestamp: new Date("2020-06-01"),
									note: faker.lorem.words(),
									currencyCode: getRandomCurrencyCode(),
									receiptId,
									locked: false,
								},
							},
						],
					};
				},
				() => null,
			);
		});
	});

	describe("update multiple debts", () => {
		describe("with non-locking values", () => {
			updateDescribes(
				async ({ defaultDebt, defaultUserId, selfAccountId, ctx }) => {
					const otherDebt = await insertDebt(ctx, selfAccountId, defaultUserId);
					return {
						updates: [
							{ id: defaultDebt.id, update: { note: faker.lorem.words() } },
							{ id: otherDebt.id, update: { note: faker.lorem.words() } },
						],
						debts: [otherDebt],
					};
				},
				() => undefined,
			);
		});

		describe("with locking values", () => {
			updateDescribes(
				async ({ defaultDebt, defaultUserId, selfAccountId, ctx }) => {
					const otherDebt = await insertDebt(ctx, selfAccountId, defaultUserId);
					return {
						updates: [
							{
								id: defaultDebt.id,
								update: { amount: getRandomAmount() },
							},
							{
								id: otherDebt.id,
								update: { amount: getRandomAmount() },
							},
						],
						debts: [otherDebt],
					};
				},
				({ debt }) => (debt.lockedTimestamp ? new Date() : undefined),
			);
		});

		describe("with distinctly locking values", () => {
			updateDescribes(
				async ({ defaultDebt, defaultUserId, selfAccountId, ctx }) => {
					const otherDebt = await insertDebt(ctx, selfAccountId, defaultUserId);
					return {
						updates: [
							{
								id: defaultDebt.id,
								update: { amount: getRandomAmount() },
							},
							{
								id: otherDebt.id,
								update: { note: faker.lorem.words() },
							},
						],
						debts: [otherDebt],
					};
				},
				({ update, debt }) =>
					debt.lockedTimestamp && update.update.amount ? new Date() : undefined,
			);
		});
	});
});
