import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountSettings,
	insertAccountWithSession,
	insertConnectedPeers,
	insertDebt,
	insertPeer,
	insertSyncedDebts,
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
				const { sessionId } = await insertAccountWithSession(ctx);
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
				accountId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId);
			// Verify that other debts don't affect the result
			await insertDebt(ctx, accountId, peerId);
			const fakeDebtId = faker.string.uuid();
			const caller = createCaller(createAuthContext(ctx, sessionId));
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
			const { id: peerId } = await insertPeer(ctx, accountId);
			await insertDebt(ctx, accountId, peerId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignAccountId);
			const { id: debtId } = await insertDebt(
				ctx,
				foreignAccountId,
				foreignPeerId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
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
			const [{ id: peerId }, { id: foreignToSelfPeerId }] =
				await insertConnectedPeers(ctx, [accountId, foreignAccountId]);
			const [{ id: debtId }] = await insertSyncedDebts(
				ctx,
				[accountId, peerId],
				[foreignAccountId, foreignToSelfPeerId],
			);

			// Verify unrelated data doesn't affect the result
			await insertPeer(ctx, accountId);
			await insertAccountSettings(ctx, accountId, { manualAcceptDebts: true });
			const { id: foreignPeerId } = await insertPeer(ctx, foreignAccountId);
			await insertDebt(ctx, accountId, peerId);
			await insertDebt(ctx, foreignAccountId, foreignPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: debtId }),
			);
			expect(result).toStrictEqual<typeof result>({ reverseRemoved: false });
		});

		describe("auto-accepted by counterparty", () => {
			test("debt exists", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: foreignPeerId }, { id: foreignToSelfPeerId }] =
					await insertConnectedPeers(ctx, [accountId, foreignAccountId]);
				const [{ id: debtId }] = await insertSyncedDebts(
					ctx,
					[accountId, foreignPeerId],
					[foreignAccountId, foreignToSelfPeerId],
				);

				// Verify unrelated data doesn't affect the result
				await insertPeer(ctx, accountId);
				await insertAccountSettings(ctx, accountId, {
					manualAcceptDebts: true,
				});
				await insertPeer(ctx, foreignAccountId);
				await insertDebt(ctx, accountId, foreignPeerId);
				await insertDebt(ctx, foreignAccountId, foreignToSelfPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ id: debtId }),
				);
				expect(result).toStrictEqual<typeof result>({ reverseRemoved: true });
			});

			test("debt does not exist", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: foreignPeerId }, { id: foreignToSelfPeerId }] =
					await insertConnectedPeers(ctx, [accountId, foreignAccountId]);
				const debt = await insertDebt(ctx, accountId, foreignPeerId);

				// Verify unrelated data doesn't affect the result
				await insertPeer(ctx, accountId);
				await insertAccountSettings(ctx, accountId, {
					manualAcceptDebts: true,
				});
				await insertPeer(ctx, foreignAccountId);
				await insertDebt(ctx, accountId, foreignPeerId);
				await insertDebt(ctx, foreignAccountId, foreignToSelfPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ id: debt.id }),
				);
				expect(result).toStrictEqual<typeof result>({ reverseRemoved: false });
			});
		});
	});
});
