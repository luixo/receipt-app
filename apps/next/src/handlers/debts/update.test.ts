import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
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
import { t } from "next-app/handlers/trpc";

import {
	getRandomCurrencyCode,
	verifyAmount,
	verifyCurrencyCode,
	verifyNote,
	verifyTimestamp,
} from "./test.utils";
import { procedure } from "./update";

const router = t.router({ procedure });

const updateDescribes = (
	getUpdate: () => TRPCMutationInput<"debts.update">["update"],
	getNextTimestamp: (lockedBefore: boolean) => Date | null | undefined,
	isReverseLockedTimestampUpdated: (
		lockedBefore: boolean,
		counterpartyAutoAcceptDebts: boolean,
	) => boolean,
) => {
	const runTest = async ({
		ctx,
		lockedBefore,
		counterPartyAccepts,
	}: {
		ctx: TestContext;
		lockedBefore: boolean;
		counterPartyAccepts: boolean;
	}) => {
		const { sessionId, accountId } = await insertAccountWithSession(ctx);
		const { id: foreignAccountId } = await insertAccount(
			ctx,
			counterPartyAccepts ? { settings: { autoAcceptDebts: true } } : undefined,
		);
		const [{ id: userId }, { id: foreignToSelfUserId }] =
			await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
		const [{ id: debtId }] = await insertSyncedDebts(
			ctx,
			[
				accountId,
				userId,
				lockedBefore ? { lockedTimestamp: new Date("2021-01-01") } : undefined,
			],
			[foreignAccountId, foreignToSelfUserId],
		);

		// Verify unrelated data doesn't affect the result
		await insertUser(ctx, accountId);
		await insertUser(ctx, foreignAccountId);
		const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
		await insertDebt(ctx, accountId, userId);
		await insertDebt(ctx, foreignAccountId, foreignUserId);

		const caller = router.createCaller(createAuthContext(ctx, sessionId));
		const result = await expectDatabaseDiffSnapshot(ctx, () =>
			caller.procedure({ id: debtId, update: getUpdate() }),
		);
		const reverseLockedTimestampUpdated = isReverseLockedTimestampUpdated(
			lockedBefore,
			counterPartyAccepts,
		);
		expect(result).toStrictEqual<typeof result>({
			lockedTimestamp: getNextTimestamp(lockedBefore),
			reverseLockedTimestampUpdated,
		});
	};

	const lockedStateTests = ({
		counterPartyAccepts,
	}: {
		counterPartyAccepts: boolean;
	}) => {
		test("locked before update", async ({ ctx }) => {
			await runTest({ ctx, lockedBefore: true, counterPartyAccepts });
		});
		test("unlocked before update", async ({ ctx }) => {
			await runTest({ ctx, lockedBefore: false, counterPartyAccepts });
		});
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
				update: { amount: Number(faker.finance.amount()) },
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
								amount: Number(faker.finance.amount()),
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
						update: { amount: Number(faker.finance.amount()) },
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
						update: { amount: Number(faker.finance.amount()) },
					}),
				"NOT_FOUND",
				`Debt "${debtId}" does not exist on account "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		describe("update amount", () => {
			updateDescribes(
				() => ({ amount: Number(faker.finance.amount()) }),
				(lockedBefore) => (lockedBefore ? new Date() : undefined),
				(lockedBefore, counterPartyAccepts) =>
					lockedBefore && counterPartyAccepts,
			);
		});

		describe("update timestamp", () => {
			updateDescribes(
				() => ({ timestamp: new Date("2020-06-01") }),
				(lockedBefore) => (lockedBefore ? new Date() : undefined),
				(lockedBefore, counterPartyAccepts) =>
					lockedBefore && counterPartyAccepts,
			);
		});

		describe("update note", () => {
			updateDescribes(
				() => ({ note: faker.lorem.words() }),
				() => undefined,
				() => false,
			);
		});

		describe("update currency code", () => {
			updateDescribes(
				() => ({ currencyCode: getRandomCurrencyCode() }),
				(lockedBefore) => (lockedBefore ? new Date() : undefined),
				(lockedBefore, counterPartyAccepts) =>
					lockedBefore && counterPartyAccepts,
			);
		});

		describe("update locked - true", () => {
			updateDescribes(
				() => ({ locked: true }),
				() => new Date(),
				(_, counterPartyAccepts) => counterPartyAccepts,
			);
		});

		describe("update locked - false", () => {
			updateDescribes(
				() => ({ locked: false }),
				() => null,
				(_, counterPartyAccepts) => counterPartyAccepts,
			);
		});

		describe("update multiple", () => {
			describe("no locked", () => {
				updateDescribes(
					() => ({
						amount: Number(faker.finance.amount()),
						timestamp: new Date("2020-06-01"),
						note: faker.lorem.words(),
						currencyCode: getRandomCurrencyCode(),
					}),
					(lockedBefore) => (lockedBefore ? new Date() : undefined),
					(lockedBefore, counterPartyAccepts) =>
						lockedBefore && counterPartyAccepts,
				);
			});

			describe("locked as true", () => {
				updateDescribes(
					() => ({
						amount: Number(faker.finance.amount()),
						timestamp: new Date("2020-06-01"),
						note: faker.lorem.words(),
						currencyCode: getRandomCurrencyCode(),
						locked: true,
					}),
					() => new Date(),
					(_, counterPartyAccepts) => counterPartyAccepts,
				);
			});

			describe("locked as false", () => {
				updateDescribes(
					() => ({
						amount: Number(faker.finance.amount()),
						timestamp: new Date("2020-06-01"),
						note: faker.lorem.words(),
						currencyCode: getRandomCurrencyCode(),
						locked: false,
					}),
					() => null,
					(_, counterPartyAccepts) => counterPartyAccepts,
				);
			});
		});
	});
});
