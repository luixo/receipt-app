import { faker } from "@faker-js/faker";
import { assert, describe, expect } from "vitest";

import type { TRPCMutationInput, TRPCMutationOutput } from "~app/trpc";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertReceipt,
	insertSyncedDebts,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectLocalTRPCError,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import type { TestContext } from "~tests/backend/utils/test";
import { test } from "~tests/backend/utils/test";
import { id, pick } from "~utils";
import type { AccountsId, UsersId } from "~web/db/models";
import { t } from "~web/handlers/trpc";

import { procedure } from "./update";
import {
	getRandomAmount,
	getRandomCurrencyCode,
	runSequentially,
	syncedProps,
	verifyAmount,
	verifyCurrencyCode,
	verifyNote,
	verifyReceiptId,
	verifyTimestamp,
} from "./utils.test";

const router = t.router({ procedure });

type GetData = (opts: {
	ctx: TestContext;
	counterParty: "accept" | "no-accept" | "accept-no-exist";
	selfAccountId: AccountsId;
	target: {
		accountId: AccountsId;
		userId: UsersId;
		meUserId: UsersId;
	};
	lockedBefore: boolean;
}) => Promise<{
	updates: TRPCMutationInput<"debts.update">[];
	results: TRPCMutationOutput<"debts.update">[];
}>;
const insertDefaultDebt = async ({
	ctx,
	counterParty,
	selfAccountId,
	target,
	lockedBefore,
}: Parameters<GetData>[0]) => {
	if (counterParty !== "accept-no-exist") {
		return (
			await insertSyncedDebts(
				ctx,
				[
					selfAccountId,
					target.userId,
					lockedBefore
						? { lockedTimestamp: new Date("2021-01-01") }
						: undefined,
				],
				[target.accountId, target.meUserId],
			)
		)[0];
	}
	return insertDebt(
		ctx,
		selfAccountId,
		target.userId,
		lockedBefore ? { lockedTimestamp: new Date("2021-01-01") } : undefined,
	);
};

type GetResult = (opts: {
	debt: Awaited<ReturnType<typeof insertDebt>>;
	counterParty: Parameters<GetData>[0]["counterParty"];
	overrideTimestamp?: (
		lockedTimestamp: TRPCMutationOutput<"debts.update">["lockedTimestamp"],
	) => TRPCMutationOutput<"debts.update">["lockedTimestamp"];
}) => TRPCMutationOutput<"debts.update">;
const getDefaultGetResult: GetResult = ({
	debt,
	counterParty,
	overrideTimestamp,
}) => {
	const nextLockedTimestamp = (overrideTimestamp || id)(
		debt.lockedTimestamp ? new Date() : undefined,
	);
	return {
		lockedTimestamp: nextLockedTimestamp,
		reverseLockedTimestampUpdated:
			counterParty === "accept-no-exist" ||
			(nextLockedTimestamp !== undefined && counterParty === "accept"),
	};
};

const updateDescribes = (getData: GetData) => {
	const runTest = async ({
		ctx,
		lockedBefore,
		counterParty,
	}: Pick<Parameters<GetData>[0], "ctx" | "lockedBefore" | "counterParty">) => {
		const { sessionId, accountId } = await insertAccountWithSession(ctx);
		const { id: foreignAccountId } = await insertAccount(
			ctx,
			counterParty === "accept" || counterParty === "accept-no-exist"
				? { settings: { autoAcceptDebts: true } }
				: undefined,
		);
		const [{ id: userId }, { id: foreignToSelfUserId }] =
			await insertConnectedUsers(ctx, [accountId, foreignAccountId]);

		// Verify unrelated data doesn't affect the result
		await insertUser(ctx, accountId);
		await insertUser(ctx, foreignAccountId);
		const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
		await insertDebt(ctx, accountId, userId);
		await insertDebt(ctx, foreignAccountId, foreignUserId);

		const { updates, results: expectedResults } = await getData({
			ctx,
			counterParty,
			selfAccountId: accountId,
			target: {
				accountId: foreignAccountId,
				userId,
				meUserId: foreignToSelfUserId,
			},
			lockedBefore,
		});

		const caller = router.createCaller(createAuthContext(ctx, sessionId));
		const results = await expectDatabaseDiffSnapshot(ctx, () =>
			runSequentially(
				updates.map((update) => () => caller.procedure(update)),
				10,
			),
		);
		expect(results).toStrictEqual<typeof results>(expectedResults);
		return {
			debtIds: updates.map((update) => update.id),
			selfAccountId: accountId,
			foreignAccountId,
		};
	};

	const lockedStateTests = ({
		counterParty,
	}: Pick<Parameters<GetData>[0], "counterParty">) => {
		test("locked before update", async ({ ctx }) => {
			await runTest({
				ctx,
				lockedBefore: true,
				counterParty,
			});
		});
		test("unlocked before update", async ({ ctx }) => {
			await runTest({
				ctx,
				lockedBefore: false,
				counterParty,
			});
		});
		if (counterParty === "accept") {
			test("debt didn't exist beforehand", async ({ ctx }) => {
				const { debtIds, selfAccountId, foreignAccountId } = await runTest({
					ctx,
					lockedBefore: false,
					counterParty: "accept-no-exist",
				});
				const debts = await ctx.database
					.selectFrom("debts")
					.where("debts.id", "in", debtIds)
					.selectAll()
					.execute();

				debtIds.forEach((debtId) => {
					const selfDebt = debts.find(
						(debt) =>
							debt.id === debtId && debt.ownerAccountId === selfAccountId,
					);
					assert(selfDebt, "Self debt does not exist");
					const pickedSelfDebt = pick(selfDebt, syncedProps);

					const foreignDebt = debts.find(
						(debt) =>
							debt.id === debtId && debt.ownerAccountId === foreignAccountId,
					);
					assert(foreignDebt, "Foreign debt does not exist");
					const pickedForeignDebt = pick(foreignDebt, syncedProps);

					expect(pickedSelfDebt).toStrictEqual<typeof pickedSelfDebt>({
						...pickedForeignDebt,
						amount: (-pickedForeignDebt.amount).toFixed(4),
					});
				});
			});
		}
	};

	describe("counterparty doesn't auto-accept", () => {
		lockedStateTests({ counterParty: "no-accept" });
	});

	describe("counterparty auto-accepts", () => {
		lockedStateTests({ counterParty: "accept" });
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
			updateDescribes(async (opts) => {
				const debt = await insertDefaultDebt(opts);
				return {
					updates: [
						{
							id: debt.id,
							update: {
								amount: getRandomAmount(),
							},
						},
					],
					results: [
						getDefaultGetResult({ debt, counterParty: opts.counterParty }),
					],
				};
			});
		});

		describe("update timestamp", () => {
			updateDescribes(async (opts) => {
				const debt = await insertDefaultDebt(opts);
				return {
					updates: [
						{
							id: debt.id,
							update: {
								timestamp: new Date("2020-06-01"),
							},
						},
					],
					results: [
						getDefaultGetResult({ debt, counterParty: opts.counterParty }),
					],
				};
			});
		});

		describe("update note", () => {
			updateDescribes(async (opts) => {
				const debt = await insertDefaultDebt(opts);
				return {
					updates: [
						{
							id: debt.id,
							update: {
								note: faker.lorem.words(),
							},
						},
					],
					results: [
						getDefaultGetResult({
							debt,
							counterParty: opts.counterParty,
							overrideTimestamp: () => undefined,
						}),
					],
				};
			});
		});

		describe("update currency code", () => {
			updateDescribes(async (opts) => {
				const debt = await insertDefaultDebt(opts);
				return {
					updates: [
						{
							id: debt.id,
							update: {
								currencyCode: getRandomCurrencyCode(),
							},
						},
					],
					results: [
						getDefaultGetResult({ debt, counterParty: opts.counterParty }),
					],
				};
			});
		});

		describe("update receipt id", () => {
			updateDescribes(async (opts) => {
				const debt = await insertDefaultDebt(opts);
				const { id: receiptId } = await insertReceipt(
					opts.ctx,
					opts.selfAccountId,
				);
				return {
					updates: [
						{
							id: debt.id,
							update: {
								receiptId,
							},
						},
					],
					results: [
						getDefaultGetResult({
							debt,
							counterParty: opts.counterParty,
							overrideTimestamp: () => undefined,
						}),
					],
				};
			});
		});

		describe("update locked - true", () => {
			updateDescribes(async (opts) => {
				const debt = await insertDefaultDebt(opts);
				return {
					updates: [
						{
							id: debt.id,
							update: {
								locked: true,
							},
						},
					],
					results: [
						getDefaultGetResult({
							debt,
							counterParty: opts.counterParty,
							overrideTimestamp: () => new Date(),
						}),
					],
				};
			});
		});

		describe("update locked - false", () => {
			updateDescribes(async (opts) => {
				const debt = await insertDefaultDebt(opts);
				return {
					updates: [
						{
							id: debt.id,
							update: {
								locked: false,
							},
						},
					],
					results: [
						getDefaultGetResult({
							debt,
							counterParty: opts.counterParty,
							overrideTimestamp: () => null,
						}),
					],
				};
			});
		});

		describe("update multiple properties", () => {
			describe("no locked", () => {
				updateDescribes(async (opts) => {
					const debt = await insertDefaultDebt(opts);
					const { id: receiptId } = await insertReceipt(
						opts.ctx,
						opts.selfAccountId,
					);
					return {
						updates: [
							{
								id: debt.id,
								update: {
									amount: getRandomAmount(),
									timestamp: new Date("2020-06-01"),
									note: faker.lorem.words(),
									currencyCode: getRandomCurrencyCode(),
									receiptId,
								},
							},
						],
						results: [
							getDefaultGetResult({ debt, counterParty: opts.counterParty }),
						],
					};
				});
			});

			describe("locked as true", () => {
				updateDescribes(async (opts) => {
					const debt = await insertDefaultDebt(opts);
					const { id: receiptId } = await insertReceipt(
						opts.ctx,
						opts.selfAccountId,
					);
					return {
						updates: [
							{
								id: debt.id,
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
						results: [
							getDefaultGetResult({
								debt,
								counterParty: opts.counterParty,
								overrideTimestamp: () => new Date(),
							}),
						],
					};
				});
			});

			describe("locked as false", () => {
				updateDescribes(async (opts) => {
					const debt = await insertDefaultDebt(opts);
					const { id: receiptId } = await insertReceipt(
						opts.ctx,
						opts.selfAccountId,
					);
					return {
						updates: [
							{
								id: debt.id,
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
						results: [
							getDefaultGetResult({
								debt,
								counterParty: opts.counterParty,
								overrideTimestamp: () => null,
							}),
						],
					};
				});
			});
		});

		describe("update multiple debts", () => {
			describe("with non-locking values", () => {
				updateDescribes(async (opts) => {
					const debt = await insertDefaultDebt(opts);
					const anotherDebt = await insertDebt(
						opts.ctx,
						opts.selfAccountId,
						opts.target.userId,
					);
					return {
						updates: [
							{ id: debt.id, update: { note: faker.lorem.words() } },
							{ id: anotherDebt.id, update: { note: faker.lorem.words() } },
						],
						results: [
							getDefaultGetResult({
								debt,
								counterParty: opts.counterParty,
								overrideTimestamp: () => undefined,
							}),
							getDefaultGetResult({
								debt: anotherDebt,
								// Another debt is not synchronized with the counterparty hence it always does not exist
								counterParty:
									opts.counterParty === "accept"
										? "accept-no-exist"
										: opts.counterParty,
								overrideTimestamp: () => undefined,
							}),
						],
					};
				});
			});

			describe("with locking values", () => {
				updateDescribes(async (opts) => {
					const debt = await insertDefaultDebt(opts);
					const anotherDebt = await insertDebt(
						opts.ctx,
						opts.selfAccountId,
						opts.target.userId,
					);
					return {
						updates: [
							{ id: debt.id, update: { amount: getRandomAmount() } },
							{ id: anotherDebt.id, update: { amount: getRandomAmount() } },
						],
						results: [
							getDefaultGetResult({
								debt,
								counterParty: opts.counterParty,
							}),
							getDefaultGetResult({
								debt: anotherDebt,
								// Another debt is not synchronized with the counterparty hence it always does not exist
								counterParty:
									opts.counterParty === "accept"
										? "accept-no-exist"
										: opts.counterParty,
							}),
						],
					};
				});
			});

			describe("with distinctly locking values", () => {
				updateDescribes(async (opts) => {
					const debt = await insertDefaultDebt(opts);
					const anotherDebt = await insertDebt(
						opts.ctx,
						opts.selfAccountId,
						opts.target.userId,
					);
					return {
						updates: [
							{ id: debt.id, update: { amount: getRandomAmount() } },
							{ id: anotherDebt.id, update: { note: faker.lorem.words() } },
						],
						results: [
							getDefaultGetResult({
								debt,
								counterParty: opts.counterParty,
							}),
							getDefaultGetResult({
								debt: anotherDebt,
								// Another debt is not synchronized with the counterparty hence it always does not exist
								counterParty:
									opts.counterParty === "accept"
										? "accept-no-exist"
										: opts.counterParty,
								overrideTimestamp: () => undefined,
							}),
						],
					};
				});
			});

			test("partially with errors", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					account: { email },
				} = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx, {
					settings: { autoAcceptDebts: true },
				});
				const [{ id: acceptingUserId }] = await insertConnectedUsers(ctx, [
					accountId,
					foreignAccountId,
				]);

				const debt = await insertDebt(ctx, accountId, acceptingUserId);
				const fakeDebtId = faker.string.uuid();

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const results = await runSequentially(
					[
						() =>
							caller.procedure({
								id: debt.id,
								update: { amount: getRandomAmount() },
							}),
						() =>
							caller
								.procedure({
									id: fakeDebtId,
									update: { amount: getRandomAmount() },
								})
								.catch((e) => e),
					],
					10,
				);
				expect(results).toHaveLength(2);
				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					lockedTimestamp: undefined,
					reverseLockedTimestampUpdated: true,
				});
				expectLocalTRPCError(
					results[1],
					"NOT_FOUND",
					`Debt "${fakeDebtId}" does not exist on account "${email}".`,
				);
			});
		});
	});
});
