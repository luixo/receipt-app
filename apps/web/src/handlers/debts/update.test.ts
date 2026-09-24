import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { pick } from "remeda";
import { assert, describe, expect } from "vitest";

import type { TRPCMutationInput, TRPCMutationOutput } from "~app/trpc";
import type { PeerId, UserId } from "~db/ids";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	assertDatabase,
	insertConnectedPeers,
	insertDebt,
	insertPeer,
	insertReceipt,
	insertSyncedDebts,
	insertUser,
	insertUserWithSession,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectLocalTRPCError,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import type { TestContext } from "~tests/backend/utils/test";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { getRandomCurrencyCode, runInBand } from "~web/handlers/utils.test";

import { procedure } from "./update";
import {
	getRandomAmount,
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
	selfUserId: UserId;
	target: {
		userId: UserId;
		peerId: PeerId;
		mePeerId: PeerId;
	};
}) => Promise<{
	updates: TRPCMutationInput<"debts.update">[];
	results: TRPCMutationOutput<"debts.update">[];
}>;
const insertDefaultDebt = async ({
	ctx,
	counterParty,
	selfUserId,
	target,
}: Parameters<GetData>[0]) => {
	if (counterParty !== "auto-accept-no-exist") {
		const syncedDebts = await insertSyncedDebts(
			ctx,
			[selfUserId, target.peerId],
			[target.userId, target.mePeerId],
		);
		return syncedDebts[0];
	}
	return insertDebt(ctx, selfUserId, target.peerId);
};

type GetResult = (opts: {
	reverseUpdatedOverride?: boolean;
	counterParty: Parameters<GetData>[0]["counterParty"];
}) => TRPCMutationOutput<"debts.update">;
const getDefaultGetResult: GetResult = ({
	counterParty,
	reverseUpdatedOverride,
}) => ({
	updatedAt: Temporal.Now.zonedDateTimeISO().add({ minutes: 1 }),
	reverseUpdated:
		counterParty === "auto-accept-no-exist" ||
		(reverseUpdatedOverride ?? counterParty === "auto-accept"),
});

const updateDescribes = (getData: GetData) => {
	const runTest = async ({
		ctx,
		counterParty,
	}: Pick<Parameters<GetData>[0], "ctx" | "counterParty">) => {
		const { sessionId, userId } = await insertUserWithSession(ctx);
		const { id: foreignUserId } = await insertUser(
			ctx,
			counterParty === "auto-accept" || counterParty === "auto-accept-no-exist"
				? undefined
				: { settings: { manualAcceptDebts: true } },
		);
		const [{ id: peerId }, { id: foreignToSelfPeerId }] =
			await insertConnectedPeers(ctx, [userId, foreignUserId]);

		// Verify unrelated data doesn't affect the result
		await insertPeer(ctx, userId);
		await insertPeer(ctx, foreignUserId);
		const { id: foreignPeerId } = await insertPeer(ctx, foreignUserId);
		await insertDebt(ctx, userId, peerId);
		await insertDebt(ctx, foreignUserId, foreignPeerId);

		const { updates, results: expectedResults } = await getData({
			ctx,
			counterParty,
			selfUserId: userId,
			target: {
				userId: foreignUserId,
				peerId,
				mePeerId: foreignToSelfPeerId,
			},
		});

		const caller = createCaller(createAuthContext(ctx, sessionId));
		const results = await expectDatabaseDiffSnapshot(ctx, () =>
			runInBand(updates.map((update) => () => caller.procedure(update))),
		);
		expect(results).toStrictEqual<typeof results>(expectedResults);
		return {
			debtIds: updates.map((update) => update.id),
			selfUserId: userId,
			foreignUserId,
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
		const { debtIds, selfUserId, foreignUserId } = await runTest({
			ctx,
			counterParty: "auto-accept-no-exist",
		});
		const database = assertDatabase(ctx);
		const debts = await database
			.selectFrom("debts")
			.where("debts.id", "in", debtIds)
			.selectAll()
			.execute();

		for (const debtId of debtIds) {
			const selfDebt = debts.find(
				(debt) => debt.id === debtId && debt.ownerUserId === selfUserId,
			);
			assert(selfDebt, "Self debt does not exist");
			const pickedSelfDebt = pick(selfDebt, syncedProps);

			const foreignDebt = debts.find(
				(debt) => debt.id === debtId && debt.ownerUserId === foreignUserId,
			);
			assert(foreignDebt, "Foreign debt does not exist");
			const pickedForeignDebt = pick(foreignDebt, syncedProps);

			expect(pickedSelfDebt).toStrictEqual<typeof pickedSelfDebt>({
				...pickedForeignDebt,
				amount: (-Number(pickedForeignDebt.amount)).toFixed(4),
			});
		}
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
				const { sessionId } = await insertUserWithSession(ctx);
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
				const { sessionId } = await insertUserWithSession(ctx);
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
				userId,
				user: { email },
			} = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);

			// Verify that other debts don't affect the result
			await insertDebt(ctx, userId, peerId);

			const fakeDebtId = faker.string.uuid();
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: fakeDebtId,
						update: { amount: getRandomAmount() },
					}),
				"NOT_FOUND",
				`Debt "${fakeDebtId}" does not exist on  user "${email}".`,
			);
		});

		test("debt is not owned by an  user", async ({ ctx }) => {
			const {
				sessionId,
				userId,
				user: { email },
			} = await insertUserWithSession(ctx);

			const { id: foreignUserId } = await insertUser(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignUserId);
			const { id: debtId } = await insertDebt(
				ctx,
				foreignUserId,
				foreignPeerId,
			);

			// Verify that other debts don't affect the result
			const { id: peerId } = await insertPeer(ctx, userId);
			await insertDebt(ctx, userId, peerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: debtId,
						update: { amount: getRandomAmount() },
					}),
				"NOT_FOUND",
				`Debt "${debtId}" does not exist on  user "${email}".`,
			);
		});

		test("mixed success and fail", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);
			const debt = await insertDebt(ctx, userId, peerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const results = await expectDatabaseDiffSnapshot(ctx, () =>
				runInBand([
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
							.catch((error) => error),
				]),
			);

			expect(results[0]).toStrictEqual<(typeof results)[0]>({
				updatedAt: Temporal.Now.zonedDateTimeISO().add({ minutes: 1 }),
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
								timestamp: Temporal.PlainDate.from("2020-06-01"),
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
					opts.selfUserId,
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
					opts.selfUserId,
				);
				return {
					updates: [
						{
							id: debt.id,
							update: {
								amount: getRandomAmount(),
								timestamp: Temporal.PlainDate.from("2020-06-01"),
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
						{
							id: debt.id,
							update: { timestamp: Temporal.PlainDate.from("2020-06-01") },
						},
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
						opts.selfUserId,
						opts.target.peerId,
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
						opts.selfUserId,
						opts.target.peerId,
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
						opts.selfUserId,
						opts.target.peerId,
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
					userId,
					user: { email },
				} = await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);
				const [{ id: acceptingPeerId }] = await insertConnectedPeers(ctx, [
					userId,
					foreignUserId,
				]);

				const debt = await insertDebt(ctx, userId, acceptingPeerId);
				const fakeDebtId = faker.string.uuid();

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await runInBand([
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
							.catch((error) => error),
				]);
				expect(results).toHaveLength(2);
				expect(results[0]).toStrictEqual<(typeof results)[0]>(
					getDefaultGetResult({ counterParty: "auto-accept" }),
				);
				expect(results[1]).toBeInstanceOf(Error);
				expectLocalTRPCError(
					results[1] as Error,
					"NOT_FOUND",
					`Debt "${fakeDebtId}" does not exist on  user "${email}".`,
				);
			});
		});

		test("local peer returns reverseUpdated as undefined", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);
			const debt = await insertDebt(ctx, userId, peerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				id: debt.id,
				update: { amount: getRandomAmount() },
			});

			expect(result).toStrictEqual<typeof result>({
				updatedAt: Temporal.Now.zonedDateTimeISO().add({ minutes: 1 }),
				reverseUpdated: undefined,
			});
		});
	});
});
