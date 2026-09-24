import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertConnectedPeers,
	insertDebt,
	insertPeer,
	insertSyncedDebts,
	insertUser,
	insertUserWithSession,
} from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debts.get", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				id: faker.string.uuid(),
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
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid UUID`,
				);
			});
		});

		test("debt not found", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);

			// Verifying adding other debts doesn't affect the error
			const { id: peerId } = await insertPeer(ctx, userId);
			await insertDebt(ctx, userId, peerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const fakeDebtId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ id: fakeDebtId }),
				"NOT_FOUND",
				`Debt "${fakeDebtId}" does not exist.`,
			);
		});

		test("debt is not owned by the  user", async ({ ctx }) => {
			// Self  user
			const { sessionId } = await insertUserWithSession(ctx);
			// Foreign  user
			const { id: foreignUserId } = await insertUser(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignUserId);
			const { id: foreignDebtId } = await insertDebt(
				ctx,
				foreignUserId,
				foreignPeerId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: foreignDebtId }),
				"FORBIDDEN",
				`You don't have access to debt "${foreignDebtId}".`,
			);
		});
	});

	describe("functionality", () => {
		test("debt is fetched", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, userId);
			const debt = await insertDebt(ctx, userId, peerId);

			// Verify other peers do not interfere
			const { id: otherPeerId } = await insertPeer(ctx, userId);
			await insertDebt(ctx, userId, otherPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ id: debt.id });
			expect(result).toStrictEqual<typeof result>({
				id: debt.id,
				peerId,
				currencyCode: debt.currencyCode,
				timestamp: debt.timestamp,
				note: debt.note,
				receiptId: debt.receiptId || undefined,
				amount: debt.amount,
				updatedAt: debt.updatedAt,
				their: undefined,
			});
		});

		describe("both counterparties' debts exist", () => {
			test("foreign sync intended", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);
				const [{ id: peerId }, { id: foreignToSelfPeerId }] =
					await insertConnectedPeers(ctx, [userId, foreignUserId]);
				const [debt, foreignDebt] = await insertSyncedDebts(
					ctx,
					[userId, peerId],
					[foreignUserId, foreignToSelfPeerId],
					{
						ahead: "their",
						fn: (originalDebt) => ({
							...originalDebt,
							amount: originalDebt.amount + 1,
						}),
					},
				);

				// Verify other peers do not interfere
				const { id: otherPeerId } = await insertPeer(ctx, userId);
				await insertDebt(ctx, userId, otherPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: debt.id });
				expect(result).toStrictEqual<typeof result>({
					id: debt.id,
					peerId,
					currencyCode: debt.currencyCode,
					timestamp: debt.timestamp,
					note: debt.note,
					receiptId: debt.receiptId || undefined,
					amount: debt.amount,
					updatedAt: debt.updatedAt,
					their: {
						updatedAt: foreignDebt.updatedAt,
						currencyCode: foreignDebt.currencyCode,
						timestamp: foreignDebt.timestamp,
						amount: -foreignDebt.amount,
					},
				});
			});
		});
	});
});
