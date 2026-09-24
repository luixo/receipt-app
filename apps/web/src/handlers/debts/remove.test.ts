import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertConnectedPeers,
	insertDebt,
	insertPeer,
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

import { procedure } from "./remove";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debts.remove", () => {
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
				() => caller.procedure({ id: fakeDebtId }),
				"NOT_FOUND",
				`No debt found by id "${fakeDebtId}" on  user "${email}"`,
			);
		});

		test("debt is not owned by an  user", async ({ ctx }) => {
			const {
				sessionId,
				userId,
				user: { email },
			} = await insertUserWithSession(ctx);
			// Verify that other debts don't affect the result
			const { id: peerId } = await insertPeer(ctx, userId);
			await insertDebt(ctx, userId, peerId);

			const { id: foreignUserId } = await insertUser(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignUserId);
			const { id: debtId } = await insertDebt(
				ctx,
				foreignUserId,
				foreignPeerId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: debtId }),
				"NOT_FOUND",
				`No debt found by id "${debtId}" on  user "${email}"`,
			);
		});
	});

	describe("functionality", () => {
		test("not auto-accepted by counterparty", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx, {
				settings: { manualAcceptDebts: true },
			});
			const [{ id: peerId }, { id: foreignToSelfPeerId }] =
				await insertConnectedPeers(ctx, [userId, foreignUserId]);
			const [{ id: debtId }] = await insertSyncedDebts(
				ctx,
				[userId, peerId],
				[foreignUserId, foreignToSelfPeerId],
			);

			// Verify unrelated data doesn't affect the result
			await insertPeer(ctx, userId);
			await insertUserSettings(ctx, userId, { manualAcceptDebts: true });
			const { id: foreignPeerId } = await insertPeer(ctx, foreignUserId);
			await insertDebt(ctx, userId, peerId);
			await insertDebt(ctx, foreignUserId, foreignPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: debtId }),
			);
			expect(result).toStrictEqual<typeof result>({ reverseRemoved: false });
		});

		describe("auto-accepted by counterparty", () => {
			test("debt exists", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);
				const [{ id: foreignPeerId }, { id: foreignToSelfPeerId }] =
					await insertConnectedPeers(ctx, [userId, foreignUserId]);
				const [{ id: debtId }] = await insertSyncedDebts(
					ctx,
					[userId, foreignPeerId],
					[foreignUserId, foreignToSelfPeerId],
				);

				// Verify unrelated data doesn't affect the result
				await insertPeer(ctx, userId);
				await insertUserSettings(ctx, userId, {
					manualAcceptDebts: true,
				});
				await insertPeer(ctx, foreignUserId);
				await insertDebt(ctx, userId, foreignPeerId);
				await insertDebt(ctx, foreignUserId, foreignToSelfPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ id: debtId }),
				);
				expect(result).toStrictEqual<typeof result>({ reverseRemoved: true });
			});

			test("debt does not exist", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);
				const [{ id: foreignPeerId }, { id: foreignToSelfPeerId }] =
					await insertConnectedPeers(ctx, [userId, foreignUserId]);
				const debt = await insertDebt(ctx, userId, foreignPeerId);

				// Verify unrelated data doesn't affect the result
				await insertPeer(ctx, userId);
				await insertUserSettings(ctx, userId, {
					manualAcceptDebts: true,
				});
				await insertPeer(ctx, foreignUserId);
				await insertDebt(ctx, userId, foreignPeerId);
				await insertDebt(ctx, foreignUserId, foreignToSelfPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ id: debt.id }),
				);
				expect(result).toStrictEqual<typeof result>({ reverseRemoved: false });
			});
		});
	});
});
