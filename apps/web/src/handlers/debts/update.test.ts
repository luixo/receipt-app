import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { pick } from "remeda";
import { assert, describe, expect } from "vitest";

import type { TRPCMutationInput, TRPCMutationOutput } from "~app/trpc";
import type { AccountsId, UsersId } from "~db/models";
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
import { MINUTE } from "~utils/time";
import { t } from "~web/handlers/trpc";
import { getRandomCurrencyCode } from "~web/handlers/utils.test";

import { procedure } from "./update";
import {
	getRandomAmount,
	runSequentially,
	syncedProps,
	verifyAmount,
	verifyCurrencyCode,
	verifyNote,
	verifyReceiptId,
	verifyTimestamp,
} from "./utils.test";

const createCaller = t.createCallerFactory(t.router({ procedure }));

type GetData = (opts: {
	ctx: TestContext;
	counterParty: "auto-accept" | "manual-accept" | "auto-accept-no-exist";
	selfAccountId: AccountsId;
	target: {
		accountId: AccountsId;
		userId: UsersId;
		meUserId: UsersId;
	};
}) => Promise<{
	updates: TRPCMutationInput<"debts.update">[];
	results: TRPCMutationOutput<"debts.update">[];
}>;
const insertDefaultDebt = async ({
	ctx,
	counterParty,
	selfAccountId,
	target,
}: Parameters<GetData>[0]) => {
	if (counterParty !== "auto-accept-no-exist") {
		return (
			await insertSyncedDebts(
				ctx,
				[selfAccountId, target.userId],
				[target.accountId, target.meUserId],
			)
		)[0];
	}
	return insertDebt(ctx, selfAccountId, target.userId);
};

type GetResult = (opts: {
	reverseUpdatedOverride?: boolean;
	counterParty: Parameters<GetData>[0]["counterParty"];
}) => TRPCMutationOutput<"debts.update">;
const getDefaultGetResult: GetResult = ({
	counterParty,
	reverseUpdatedOverride,
}) => ({
	updatedAt: new Date(new Date().valueOf() + MINUTE),
	reverseUpdated:
		counterParty === "auto-accept-no-exist" ||
		(reverseUpdatedOverride ?? counterParty === "auto-accept"),
});

const updateDescribes = (getData: GetData) => {
	const runTest = async ({
		ctx,
		counterParty,
	}: Pick<Parameters<GetData>[0], "ctx" | "counterParty">) => {
		const { sessionId, accountId } = await insertAccountWithSession(ctx);
		const { id: foreignAccountId } = await insertAccount(
			ctx,
			counterParty === "auto-accept" || counterParty === "auto-accept-no-exist"
				? undefined
				: { settings: { manualAcceptDebts: true } },
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
		});

		const caller = createCaller(createAuthContext(ctx, sessionId));
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

	test("counterparty accepts manually", async ({ ctx }) => {
		await runTest({ ctx, counterParty: "manual-accept" });
	});

	test("counterparty auto-accepts - debt existed beforehand", async ({
		ctx,
	}) => {
		await runTest({ ctx, counterParty: "auto-accept" });
	});

	test("counterparty auto-accepts - debt didn't exist beforehand", async ({
		ctx,
	}) => {
		const { debtIds, selfAccountId, foreignAccountId } = await runTest({
			ctx,
			counterParty: "auto-accept-no-exist",
		});
		const debts = await ctx.database
			.selectFrom("debts")
			.where("debts.id", "in", debtIds)
			.selectAll()
			.execute();

		debtIds.forEach((debtId) => {
			const selfDebt = debts.find(
				(debt) => debt.id === debtId && debt.ownerAccountId === selfAccountId,
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
				amount: (-Number(pickedForeignDebt.amount)).toFixed(4),
			});
		});
	});
};

describe("debts.update", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				id: faker.string.uuid(),
				update: { amount: getRandomAmount() },
			}),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							id: "not-a-valid-uuid",
							update: {
								amount: getRandomAmount(),
							},
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid UUID`,
				);
			});
		});

		describe("update", () => {
			test("should have at least one key", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
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
				createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { amount },
				}),
			"update.",
		);

		verifyNote(
			(context, note) =>
				createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { note },
				}),
			"update.",
		);

		verifyCurrencyCode(
			(context, currencyCode) =>
				createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { currencyCode },
				}),
			"update.",
		);

		verifyTimestamp(
			(context, timestamp) =>
				createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { timestamp },
				}),
			"update.",
		);

		verifyReceiptId(
			(context, receiptId) =>
				createCaller(context).procedure({
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
			const caller = createCaller(createAuthContext(ctx, sessionId));
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

			const caller = createCaller(createAuthContext(ctx, sessionId));
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

		test("mixed success and fail", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);
			const debt = await insertDebt(ctx, accountId, userId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const results = await expectDatabaseDiffSnapshot(ctx, () =>
				runSequentially(
					[
						() =>
							caller.procedure({
								id: debt.id,
								update: { amount: getRandomAmount() },
							}),
						() =>
							caller
								.procedure({
									id: "not-a-valid-uuid",
									update: { amount: getRandomAmount() },
								})
								.catch((e) => e),
					],
					10,
				),
			);

			expect(results[0]).toStrictEqual<(typeof results)[0]>({
				updatedAt: new Date(new Date().valueOf() + MINUTE),
				reverseUpdated: undefined,
			});
			expect(results[1]).toBeInstanceOf(TRPCError);
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
					results: [getDefaultGetResult({ counterParty: opts.counterParty })],
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
					results: [getDefaultGetResult({ counterParty: opts.counterParty })],
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
							counterParty: opts.counterParty,
							reverseUpdatedOverride: false,
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
					results: [getDefaultGetResult({ counterParty: opts.counterParty })],
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
					results: [getDefaultGetResult({ counterParty: opts.counterParty })],
				};
			});
		});

		describe("update multiple properties", () => {
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
					results: [getDefaultGetResult({ counterParty: opts.counterParty })],
				};
			});
		});

		describe("update multiple properties with multiple requests", () => {
			updateDescribes(async (opts) => {
				const debt = await insertDefaultDebt(opts);
				return {
					updates: [
						{ id: debt.id, update: { amount: getRandomAmount() } },
						{ id: debt.id, update: { timestamp: new Date("2020-06-01") } },
					],
					results: [
						getDefaultGetResult({ counterParty: opts.counterParty }),
						getDefaultGetResult({ counterParty: opts.counterParty }),
					],
				};
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
								counterParty: opts.counterParty,
								reverseUpdatedOverride: false,
							}),
							getDefaultGetResult({
								reverseUpdatedOverride: false,
								// Another debt is not synchronized with the counterparty hence it always does not exist
								counterParty:
									opts.counterParty === "auto-accept"
										? "auto-accept-no-exist"
										: opts.counterParty,
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
								counterParty: opts.counterParty,
							}),
							getDefaultGetResult({
								// Another debt is not synchronized with the counterparty hence it always does not exist
								counterParty:
									opts.counterParty === "auto-accept"
										? "auto-accept-no-exist"
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
								counterParty: opts.counterParty,
							}),
							getDefaultGetResult({
								reverseUpdatedOverride: false,
								// Another debt is not synchronized with the counterparty hence it always does not exist
								counterParty:
									opts.counterParty === "auto-accept"
										? "auto-accept-no-exist"
										: opts.counterParty,
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
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: acceptingUserId }] = await insertConnectedUsers(ctx, [
					accountId,
					foreignAccountId,
				]);

				const debt = await insertDebt(ctx, accountId, acceptingUserId);
				const fakeDebtId = faker.string.uuid();

				const caller = createCaller(createAuthContext(ctx, sessionId));
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
				expect(results[0]).toStrictEqual<(typeof results)[0]>(
					getDefaultGetResult({ counterParty: "auto-accept" }),
				);
				expect(results[1]).toBeInstanceOf(Error);
				expectLocalTRPCError(
					results[1] as Error,
					"NOT_FOUND",
					`Debt "${fakeDebtId}" does not exist on account "${email}".`,
				);
			});
		});

		test("local user returns reverseUpdated as undefined", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);
			const debt = await insertDebt(ctx, accountId, userId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				id: debt.id,
				update: { amount: getRandomAmount() },
			});

			expect(result).toStrictEqual<typeof result>({
				updatedAt: new Date(new Date().valueOf() + MINUTE),
				reverseUpdated: undefined,
			});
		});
	});
});
