import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertConnectedPeers,
	insertDebt,
	insertPeer,
	insertReceipt,
	insertSyncedDebts,
	insertUser,
	insertUserSettings,
	insertUserWithSession,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { getRandomCurrencyCode, runInBand } from "~web/handlers/utils.test";

import { procedure } from "./accept";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debtIntentions.accept", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ id: faker.string.uuid() }),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ id: "not-a-valid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid UUID`,
				);
			});
		});

		test("debt does not exist", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);

			// Verify that other debts don't affect the result
			await insertDebt(ctx, userId, peerId);

			const fakeDebtId = faker.string.uuid();
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: fakeDebtId }),
				"NOT_FOUND",
				`Intention for debt "${fakeDebtId}" is not found.`,
			);
		});

		test("mixed success and fail", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx);
			const [, { id: foreignToSelfPeerId }] = await insertConnectedPeers(ctx, [
				userId,
				foreignUserId,
			]);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
			const { id: foreignDebtId } = await insertDebt(
				ctx,
				foreignUserId,
				foreignToSelfPeerId,
				{
					createdAt: Temporal.ZonedDateTime.from(
						"2020-05-01T00:00:00.000[GMT]",
					),
					receiptId: foreignReceiptId,
				},
			);

			const fakeDebtId = faker.string.uuid();

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const results = await expectDatabaseDiffSnapshot(ctx, () =>
				runInBand([
					() => caller.procedure({ id: foreignDebtId }),
					() => caller.procedure({ id: fakeDebtId }).catch((error) => error),
				]),
			);

			expect(results[0]).toStrictEqual<(typeof results)[0]>({
				updatedAt: Temporal.Now.zonedDateTimeISO(),
			});
			expect(results[1]).toBeInstanceOf(TRPCError);
		});
	});

	describe("functionality", () => {
		test("debt did not exist on our  user beforehand", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx);
			const [{ id: peerId }, { id: foreignToSelfPeerId }] =
				await insertConnectedPeers(ctx, [userId, foreignUserId]);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
			const { id: foreignDebtId } = await insertDebt(
				ctx,
				foreignUserId,
				foreignToSelfPeerId,
				{
					createdAt: Temporal.ZonedDateTime.from(
						"2020-05-01T00:00:00.000[GMT]",
					),
					receiptId: foreignReceiptId,
				},
			);

			// Verify unrelated data doesn't affect the result
			await insertPeer(ctx, userId);
			await insertUserSettings(ctx, userId, { manualAcceptDebts: true });
			const { id: anotherForeignPeerId } = await insertPeer(ctx, foreignUserId);
			await insertDebt(ctx, userId, peerId);
			await insertDebt(ctx, foreignUserId, anotherForeignPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: foreignDebtId }),
			);
			expect(result).toStrictEqual<typeof result>({
				updatedAt: Temporal.Now.zonedDateTimeISO(),
			});
		});

		test("debt existed on our  user beforehand - their updatedAt ahead", async ({
			ctx,
		}) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx);
			const [{ id: peerId }, { id: foreignToSelfPeerId }] =
				await insertConnectedPeers(ctx, [userId, foreignUserId]);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
			const [debt] = await insertSyncedDebts(
				ctx,
				[userId, peerId],
				[foreignUserId, foreignToSelfPeerId],
				{
					fn: (originalDebt) => ({
						...originalDebt,
						currencyCode: getRandomCurrencyCode(),
						amount: originalDebt.amount + 1,
						timestamp: Temporal.PlainDate.from("2020-04-01"),
						createdAt: Temporal.ZonedDateTime.from(
							"2020-05-01T00:00:00.000[GMT]",
						),
						note: faker.lorem.words(),
						receiptId: foreignReceiptId,
					}),
					ahead: "their",
				},
			);

			// Verify unrelated data doesn't affect the result
			await insertPeer(ctx, userId);
			const { id: anotherForeignPeerId } = await insertPeer(ctx, foreignUserId);
			await insertDebt(ctx, userId, peerId);
			await insertDebt(ctx, foreignUserId, anotherForeignPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: debt.id }),
			);
			expect(result).toStrictEqual<typeof result>({
				updatedAt: debt.updatedAt.add({ minutes: 1 }),
			});
		});

		test("debt existed on our  user beforehand - our updatedAt ahead", async ({
			ctx,
		}) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx);
			const [{ id: peerId }, { id: foreignToSelfPeerId }] =
				await insertConnectedPeers(ctx, [userId, foreignUserId]);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
			const [debt] = await insertSyncedDebts(
				ctx,
				[userId, peerId],
				[foreignUserId, foreignToSelfPeerId],
				{
					ahead: "our",
					fn: (originalDebt) => ({
						...originalDebt,
						currencyCode: getRandomCurrencyCode(),
						amount: Number(faker.finance.amount()),
						timestamp: Temporal.PlainDate.from("2020-04-01"),
						createdAt: Temporal.ZonedDateTime.from(
							"2020-05-01T00:00:00.000[GMT]",
						),
						note: faker.lorem.words(),
						receiptId: foreignReceiptId,
					}),
				},
			);

			// Verify unrelated data doesn't affect the result
			await insertPeer(ctx, userId);
			const { id: anotherForeignPeerId } = await insertPeer(ctx, foreignUserId);
			await insertDebt(ctx, userId, peerId);
			await insertDebt(ctx, foreignUserId, anotherForeignPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: debt.id }),
			);
			expect(result).toStrictEqual<typeof result>({
				updatedAt: debt.updatedAt.add({ minutes: 1 }),
			});
		});

		test("multiple different debts with multiple peers", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx);
			const [{ id: selfPeerId }, { id: foreignToSelfPeerId }] =
				await insertConnectedPeers(ctx, [userId, foreignUserId]);
			const { id: anotherForeignUserId } = await insertUser(ctx);
			const [{ id: anotherSelfPeerId }, { id: anotherForeignToSelfPeerId }] =
				await insertConnectedPeers(ctx, [userId, anotherForeignUserId]);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
			// A new debt
			const newDebt = await insertDebt(
				ctx,
				foreignUserId,
				foreignToSelfPeerId,
				{
					createdAt: Temporal.ZonedDateTime.from(
						"2020-05-01T00:00:00.000[GMT]",
					),
				},
			);
			// A connected with our updatedAt ahead
			const [updatedDebtAhead] = await insertSyncedDebts(
				ctx,
				[userId, selfPeerId],
				[foreignUserId, foreignToSelfPeerId],
				{
					ahead: "our",
					fn: (originalDebt) => ({
						...originalDebt,
						currencyCode: getRandomCurrencyCode(),
						amount: Number(faker.finance.amount()),
						timestamp: Temporal.PlainDate.from("2020-04-01"),
						createdAt: Temporal.ZonedDateTime.from(
							"2020-05-01T00:00:00.000[GMT]",
						),
						note: faker.lorem.words(),
						receiptId: foreignReceiptId,
					}),
				},
			);
			// A connected with their updatedAt ahead
			const [updatedDebtBehind] = await insertSyncedDebts(
				ctx,
				[userId, anotherSelfPeerId],
				[anotherForeignUserId, anotherForeignToSelfPeerId],
				{
					fn: (originalDebt) => ({
						...originalDebt,
						currencyCode: getRandomCurrencyCode(),
						amount: originalDebt.amount + 1,
						timestamp: Temporal.PlainDate.from("2020-04-01"),
						createdAt: Temporal.ZonedDateTime.from(
							"2020-05-01T00:00:00.000[GMT]",
						),
						note: faker.lorem.words(),
					}),
					ahead: "their",
				},
			);

			// Verify unrelated data doesn't affect the result
			await insertPeer(ctx, userId);
			const { id: anotherForeignPeerId } = await insertPeer(ctx, foreignUserId);
			await insertDebt(ctx, userId, selfPeerId);
			await insertDebt(ctx, foreignUserId, anotherForeignPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				runInBand([
					() => caller.procedure({ id: newDebt.id }),
					() => caller.procedure({ id: updatedDebtAhead.id }),
					() => caller.procedure({ id: updatedDebtBehind.id }),
				]),
			);
			expect(result).toStrictEqual<typeof result>([
				{ updatedAt: newDebt.updatedAt },
				{
					updatedAt: updatedDebtAhead.updatedAt.add({
						minutes: 1,
					}),
				},
				{
					updatedAt: updatedDebtBehind.updatedAt.add({
						minutes: 1,
					}),
				},
			]);
		});
	});
});
