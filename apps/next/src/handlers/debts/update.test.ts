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
import { pick } from "app/utils/utils";
import type { DebtsId, ReceiptsId } from "next-app/db/models";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./update";
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
	getUpdate: (opts: {
		receiptId: ReceiptsId;
	}) => TRPCMutationInput<"debts.update">["update"],
	getNextTimestamp: (lockedBefore: boolean) => Date | null | undefined,
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
		const { id: receiptId } = await insertReceipt(ctx, accountId);
		let debtId: DebtsId;
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
			debtId = syncedDebt.id;
		} else {
			const unsyncedDebt = await insertDebt(
				ctx,
				accountId,
				userId,
				lockedBefore
					? { lockedTimestamp: new Date("2021-01-01"), receiptId }
					: { receiptId },
			);
			debtId = unsyncedDebt.id;
		}

		// Verify unrelated data doesn't affect the result
		await insertUser(ctx, accountId);
		await insertUser(ctx, foreignAccountId);
		const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
		await insertDebt(ctx, accountId, userId);
		await insertDebt(ctx, foreignAccountId, foreignUserId);
		const { id: newReceiptId } = await insertReceipt(ctx, accountId);

		const caller = router.createCaller(createAuthContext(ctx, sessionId));
		const result = await expectDatabaseDiffSnapshot(ctx, () =>
			caller.procedure({
				id: debtId,
				update: getUpdate({ receiptId: newReceiptId }),
			}),
		);
		const nextLockedTimestamp = getNextTimestamp(lockedBefore);
		const reverseLockedTimestampUpdated =
			(nextLockedTimestamp !== undefined && counterPartyAccepts) ||
			!counterPartyExists;
		expect(result).toStrictEqual<typeof result>({
			lockedTimestamp: nextLockedTimestamp,
			reverseLockedTimestampUpdated,
		});
		return {
			debtId,
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

describe("debts.update", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({
				id: faker.string.uuid(),
				update: { amount: getRandomAmount() },
			}),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							id: "not-a-valid-uuid",
							update: {
								amount: getRandomAmount(),
							},
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid uuid`,
				);
			});
		});

		describe("update", () => {
			test("should have at least one key", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							id: faker.string.uuid(),
							update: {},
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "update": Update object has to have at least one key to update`,
				);
			});
		});

		verifyAmount(
			(context, amount) =>
				router.createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { amount },
				}),
			"update.",
		);

		verifyNote(
			(context, note) =>
				router.createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { note },
				}),
			"update.",
		);

		verifyCurrencyCode(
			(context, currencyCode) =>
				router.createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { currencyCode },
				}),
			"update.",
		);

		verifyTimestamp(
			(context, timestamp) =>
				router.createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { timestamp },
				}),
			"update.",
		);

		verifyReceiptId(
			(context, receiptId) =>
				router.createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { receiptId },
				}),
			"update.",
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
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: fakeDebtId,
						update: { amount: getRandomAmount() },
					}),
				"NOT_FOUND",
				`Debt "${fakeDebtId}" does not exist on account "${email}".`,
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
					caller.procedure({
						id: debtId,
						update: { amount: getRandomAmount() },
					}),
				"NOT_FOUND",
				`Debt "${debtId}" does not exist on account "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		describe("update amount", () => {
			updateDescribes(
				() => ({ amount: getRandomAmount() }),
				(lockedBefore) => (lockedBefore ? new Date() : undefined),
			);
		});

		describe("update timestamp", () => {
			updateDescribes(
				() => ({ timestamp: new Date("2020-06-01") }),
				(lockedBefore) => (lockedBefore ? new Date() : undefined),
			);
		});

		describe("update note", () => {
			updateDescribes(
				() => ({ note: faker.lorem.words() }),
				() => undefined,
			);
		});

		describe("update currency code", () => {
			updateDescribes(
				() => ({ currencyCode: getRandomCurrencyCode() }),
				(lockedBefore) => (lockedBefore ? new Date() : undefined),
			);
		});

		describe("update receipt id", () => {
			updateDescribes(
				({ receiptId }) => ({ receiptId }),
				() => undefined,
			);
		});

		describe("update locked - true", () => {
			updateDescribes(
				() => ({ locked: true }),
				() => new Date(),
			);
		});

		describe("update locked - false", () => {
			updateDescribes(
				() => ({ locked: false }),
				() => null,
			);
		});

		describe("update multiple", () => {
			describe("no locked", () => {
				updateDescribes(
					({ receiptId }) => ({
						amount: getRandomAmount(),
						timestamp: new Date("2020-06-01"),
						note: faker.lorem.words(),
						currencyCode: getRandomCurrencyCode(),
						receiptId,
					}),
					(lockedBefore) => (lockedBefore ? new Date() : undefined),
				);
			});

			describe("locked as true", () => {
				updateDescribes(
					({ receiptId }) => ({
						amount: getRandomAmount(),
						timestamp: new Date("2020-06-01"),
						note: faker.lorem.words(),
						currencyCode: getRandomCurrencyCode(),
						receiptId,
						locked: true,
					}),
					() => new Date(),
				);
			});

			describe("locked as false", () => {
				updateDescribes(
					({ receiptId }) => ({
						amount: getRandomAmount(),
						timestamp: new Date("2020-06-01"),
						note: faker.lorem.words(),
						currencyCode: getRandomCurrencyCode(),
						receiptId,
						locked: false,
					}),
					() => null,
				);
			});
		});
	});
});
