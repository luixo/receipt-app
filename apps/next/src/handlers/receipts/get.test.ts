import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertReceipt,
	insertReceiptItem,
	insertReceiptParticipant,
	insertSyncedDebts,
	insertUser,
} from "@tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./get";
import { getSum } from "./utils.test";

const router = t.router({ procedure });

describe("receipts.get", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({ id: faker.string.uuid() }),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ id: "not-a-valid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid uuid`,
				);
			});
		});

		test("receipt not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			// Verifying adding other receipts doesn't affect the error
			await insertReceipt(ctx, accountId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const fakeReceiptId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ id: fakeReceiptId }),
				"NOT_FOUND",
				`Receipt "${fakeReceiptId}" is not found.`,
			);
		});

		test("account has no role in the receipt", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: foreignReceiptId }),
				"FORBIDDEN",
				`Account "${email}" has no access to receipt "${foreignReceiptId}"`,
			);
		});
	});

	describe("functionality", () => {
		describe("account is an owner", () => {
			test("no participation", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);
				const receipt = await insertReceipt(ctx, accountId);

				// Verify other users do not interfere
				const { id: foreignAccountId } = await insertAccount(ctx);
				await insertReceipt(ctx, foreignAccountId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					participantResolved: null,
					ownerUserId: selfUserId,
					selfUserId,
					sum: 0,
					role: "owner",
				});
			});

			test("with participation", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);
				const receipt = await insertReceipt(ctx, accountId);
				await insertReceiptParticipant(ctx, receipt.id, selfUserId);

				// Verify other users do not interfere
				const { id: foreignAccountId } = await insertAccount(ctx);
				await insertReceipt(ctx, foreignAccountId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					participantResolved: false,
					ownerUserId: selfUserId,
					selfUserId,
					sum: 0,
					role: "owner",
				});
			});

			test("with participation, resolved, locked receipt", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);
				const receipt = await insertReceipt(ctx, accountId, {
					lockedTimestamp: new Date(),
				});
				await insertReceiptParticipant(ctx, receipt.id, selfUserId, {
					resolved: true,
				});

				// Verify other users do not interfere
				const { id: foreignAccountId } = await insertAccount(ctx);
				await insertReceipt(ctx, foreignAccountId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					participantResolved: true,
					ownerUserId: selfUserId,
					selfUserId,
					lockedTimestamp: receipt.lockedTimestamp || undefined,
					sum: 0,
					role: "owner",
				});
			});

			test("with transfer intention", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const receipt = await insertReceipt(ctx, accountId, {
					lockedTimestamp: new Date(),
					transferIntentionAccountId: foreignAccountId,
				});
				const [foreignUser] = await insertConnectedUsers(ctx, [
					accountId,
					foreignAccountId,
				]);

				// Verify other users do not interfere
				await insertReceipt(ctx, foreignAccountId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					participantResolved: null,
					ownerUserId: selfUserId,
					selfUserId,
					lockedTimestamp: receipt.lockedTimestamp || undefined,
					sum: 0,
					role: "owner",
					transferIntentionUserId: foreignUser.id,
				});
			});
		});

		test("sum is calculated properly", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			const receipt = await insertReceipt(ctx, accountId);
			const receiptItems = await Promise.all(
				Array.from({ length: 6 }, () => insertReceiptItem(ctx, receipt.id)),
			);

			// Verify other users do not interfere
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: anotherReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptItem(ctx, anotherReceiptId);
			await insertReceiptItem(ctx, anotherReceiptId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ id: receipt.id });
			expect(result).toStrictEqual<typeof result>({
				id: receipt.id,
				name: receipt.name,
				currencyCode: receipt.currencyCode,
				issued: receipt.issued,
				participantResolved: null,
				ownerUserId: selfUserId,
				selfUserId,
				sum: getSum(receiptItems),
				role: "owner",
			});
		});

		describe("account is a participant", () => {
			test("editor, resolved", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: foreignUserId }, { id: foreignToSelfUserId }] =
					await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
				const receipt = await insertReceipt(ctx, foreignAccountId);
				await insertReceiptParticipant(ctx, receipt.id, foreignToSelfUserId, {
					resolved: true,
					role: "editor",
				});

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					participantResolved: true,
					ownerUserId: foreignUserId,
					selfUserId: foreignToSelfUserId,
					sum: 0,
					role: "editor",
				});
			});

			test("viewer, not resolved, locked receipt", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: foreignUserId }, { id: foreignToSelfUserId }] =
					await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
				const receipt = await insertReceipt(ctx, foreignAccountId, {
					lockedTimestamp: new Date(),
				});
				await insertReceiptParticipant(ctx, receipt.id, foreignToSelfUserId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					participantResolved: false,
					ownerUserId: foreignUserId,
					selfUserId: foreignToSelfUserId,
					lockedTimestamp: receipt.lockedTimestamp || undefined,
					sum: 0,
					role: "viewer",
				});
			});
		});

		describe("with connected debt", () => {
			test("incoming - has only theirs", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: foreignUserId }, { id: foreignToSelfUserId }] =
					await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
				const receipt = await insertReceipt(ctx, foreignAccountId, {
					lockedTimestamp: new Date(),
				});
				await insertReceiptParticipant(ctx, receipt.id, foreignToSelfUserId);
				const { id: foreignDebtId } = await insertDebt(
					ctx,
					foreignAccountId,
					foreignToSelfUserId,
					{ receiptId: receipt.id },
				);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					participantResolved: false,
					ownerUserId: foreignUserId,
					selfUserId: foreignToSelfUserId,
					lockedTimestamp: receipt.lockedTimestamp || undefined,
					sum: 0,
					role: "viewer",
					debt: {
						direction: "incoming",
						type: "foreign",
						id: foreignDebtId,
					},
				});
			});

			test("incoming - has only ours", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: foreignUserId }, { id: foreignToSelfUserId }] =
					await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
				const receipt = await insertReceipt(ctx, foreignAccountId, {
					lockedTimestamp: new Date(),
				});
				await insertReceiptParticipant(ctx, receipt.id, foreignToSelfUserId);
				const { id: debtId } = await insertDebt(ctx, accountId, foreignUserId, {
					receiptId: receipt.id,
				});

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					participantResolved: false,
					ownerUserId: foreignUserId,
					selfUserId: foreignToSelfUserId,
					lockedTimestamp: receipt.lockedTimestamp || undefined,
					sum: 0,
					role: "viewer",
					debt: {
						direction: "incoming",
						type: "mine",
						id: debtId,
					},
				});
			});

			test("incoming - has both", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: foreignUserId }, { id: foreignToSelfUserId }] =
					await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
				const receipt = await insertReceipt(ctx, foreignAccountId, {
					lockedTimestamp: new Date(),
				});
				await insertReceiptParticipant(ctx, receipt.id, foreignToSelfUserId);
				const [{ id: debtId }] = await insertSyncedDebts(
					ctx,
					[foreignAccountId, foreignToSelfUserId, { receiptId: receipt.id }],
					[accountId, foreignUserId],
				);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					participantResolved: false,
					ownerUserId: foreignUserId,
					selfUserId: foreignToSelfUserId,
					lockedTimestamp: receipt.lockedTimestamp || undefined,
					sum: 0,
					role: "viewer",
					debt: {
						direction: "incoming",
						type: "mine",
						id: debtId,
					},
				});
			});

			test("outcoming", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);
				const receipt = await insertReceipt(ctx, accountId, {
					lockedTimestamp: new Date(),
				});
				const { id: userId } = await insertUser(ctx, accountId);
				const { id: anotherUserId } = await insertUser(ctx, accountId);
				const debts = await Promise.all([
					insertDebt(ctx, accountId, userId, { receiptId: receipt.id }),
					insertDebt(ctx, accountId, anotherUserId, { receiptId: receipt.id }),
				]);

				// Verify other users do not interfere
				const { id: foreignAccountId } = await insertAccount(ctx);
				await insertReceipt(ctx, foreignAccountId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					participantResolved: null,
					ownerUserId: selfUserId,
					selfUserId,
					lockedTimestamp: receipt.lockedTimestamp || undefined,
					sum: 0,
					role: "owner",
					debt: {
						direction: "outcoming",
						ids: debts.map((debt) => debt.id).sort(),
					},
				});
			});
		});
	});
});
