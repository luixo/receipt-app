import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { MAX_LIMIT } from "~app/utils/validation";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertReceipt,
	insertReceiptParticipant,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { MONTH } from "~utils/time";
import { t } from "~web/handlers/trpc";

import { procedure } from "./suggest-top";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("users.suggestTop", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				limit: 1,
			}),
		);

		describe("limit", () => {
			test("is <= 0", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							limit: 0,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Number must be greater than 0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							limit: MAX_LIMIT + 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Number must be less than or equal to 100`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							limit: faker.number.float(),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Expected integer, received float`,
				);
			});
		});

		describe("filtered ids", () => {
			test("has non-uuid values", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							limit: 1,
							filterIds: [faker.string.alpha()],
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "filterIds[0]": Invalid uuid`,
				);
			});
		});

		describe("non-connected receipt id", () => {
			test("has non-uuid value", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							limit: 1,
							options: {
								type: "not-connected-receipt",
								receiptId: faker.string.alpha(),
							},
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "options.receiptId": Invalid uuid`,
				);
			});
		});

		test("receipt does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			// Verifying adding other receipts don't affect the error
			await insertReceipt(ctx, accountId);
			const nonExistentReceiptId = faker.string.uuid();
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						limit: 1,
						options: {
							type: "not-connected-receipt",
							receiptId: nonExistentReceiptId,
						},
					}),
				"NOT_FOUND",
				`Receipt "${nonExistentReceiptId}" does not exist.`,
			);
		});

		test("has no role in a requested receipt", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: receiptId } = await insertReceipt(ctx, otherAccountId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						limit: 1,
						options: {
							type: "not-connected-receipt",
							receiptId,
						},
					}),
				"FORBIDDEN",
				`Not enough rights to view receipt "${receiptId}".`,
			);
		});
	});

	describe("functionality", () => {
		describe("no restriction (from debts)", () => {
			test("returns top users", async ({ ctx }) => {
				const otherAccount = await insertAccount(ctx);
				const { sessionId, accountId } = await insertAccountWithSession(ctx);

				const secondAccount = await insertAccount(ctx);

				// Verify other users don't affect our top users
				await insertUser(ctx, otherAccount.id);

				const user = await insertUser(ctx, accountId);
				const [connectedUser] = await insertConnectedUsers(ctx, [
					accountId,
					otherAccount.id,
				]);
				const publicNamedUser = await insertUser(ctx, accountId, {
					publicName: faker.person.fullName(),
				});
				const [connectedPublicNamedUser] = await insertConnectedUsers(ctx, [
					{ accountId, publicName: faker.person.fullName() },
					secondAccount.id,
				]);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 4,
				});
				expect(result).toStrictEqual<typeof result>({
					items: [
						user,
						connectedUser,
						connectedPublicNamedUser,
						publicNamedUser,
					]
						.map(({ id }) => id)
						.sort(),
				});
			});

			test("users are sorted by debts amount and by uuid", async ({ ctx }) => {
				const { id: otherAccountId } = await insertAccount(ctx);
				const { sessionId, accountId } = await insertAccountWithSession(ctx);

				// Verify other users don't affect our top users
				const { id: otherUserId } = await insertUser(ctx, otherAccountId);
				await insertDebt(ctx, accountId, otherUserId);
				await insertDebt(ctx, accountId, otherUserId);
				await insertDebt(ctx, accountId, otherUserId);

				const { id: oneDebtUserId } = await insertUser(ctx, accountId);
				const [{ id: twoDebtsUserId }] = await insertConnectedUsers(ctx, [
					accountId,
					otherAccountId,
				]);
				const { id: threeDebtsUserId } = await insertUser(ctx, accountId);
				const { id: zeroDebtsUserId } = await insertUser(ctx, accountId);
				const { id: lastZeroDebtsUserId } = await insertUser(ctx, accountId, {
					id: faker.string.uuid().replace(/^./g, "f"),
				});

				await insertDebt(ctx, accountId, oneDebtUserId);
				await insertDebt(ctx, accountId, twoDebtsUserId);
				await insertDebt(ctx, accountId, twoDebtsUserId);
				await insertDebt(ctx, accountId, threeDebtsUserId);
				await insertDebt(ctx, accountId, threeDebtsUserId);
				await insertDebt(ctx, accountId, threeDebtsUserId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 5,
				});
				expect(result.items).toStrictEqual([
					threeDebtsUserId,
					twoDebtsUserId,
					oneDebtUserId,
					zeroDebtsUserId,
					lastZeroDebtsUserId,
				]);
			});

			test("returns users with no debts", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertUser(ctx, accountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
				});
				expect(result.items.length).toBe(1);
			});

			test("limit is applied", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertUser(ctx, accountId);
				await insertUser(ctx, accountId);
				await insertUser(ctx, accountId);
				const limit = 2;
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit,
				});
				expect(result.items.length).toBe(limit);
			});

			test("ignores users from filterIds", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertUser(ctx, accountId);
				const { id: ignoredUserId } = await insertUser(ctx, accountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
					filterIds: [ignoredUserId],
				});
				expect(result.items.length).toBe(1);
			});

			test("returns users based by debts created date", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: oldDebtsUserId } = await insertUser(ctx, accountId);
				const { id: newDebtsUserId } = await insertUser(ctx, accountId);
				await insertDebt(ctx, accountId, oldDebtsUserId, {
					timestamp: new Date(Date.now() - MONTH - MONTH),
				});
				await insertDebt(ctx, accountId, oldDebtsUserId, {
					timestamp: new Date(Date.now() - MONTH - MONTH),
				});
				await insertDebt(ctx, accountId, newDebtsUserId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
				});
				expect(result.items).toStrictEqual([newDebtsUserId, oldDebtsUserId]);
			});
		});

		describe("(not) connected users", () => {
			test("returns top users", async ({ ctx }) => {
				const { id: otherAccountId } = await insertAccount(ctx);
				const { sessionId, accountId } = await insertAccountWithSession(ctx);

				// Verify other users don't affect our top users
				await insertUser(ctx, otherAccountId);

				const user = await insertUser(ctx, accountId);
				const publicNamedUser = await insertUser(ctx, accountId, {
					publicName: faker.person.fullName(),
				});
				await insertConnectedUsers(ctx, [accountId, otherAccountId]);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 4,
					options: { type: "not-connected" },
				});
				expect(result).toStrictEqual<typeof result>({
					items: [user, publicNamedUser].map(({ id }) => id).sort(),
				});
			});

			test("returns top connected users", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const otherAccounts = await Promise.all([
					insertAccount(ctx),
					insertAccount(ctx),
				]);

				// Verify other users don't affect our top users
				await insertUser(ctx, otherAccounts[0].id);

				await insertUser(ctx, accountId);
				const connectedUserTuples = await Promise.all(
					otherAccounts.map((otherAccount, index) =>
						insertConnectedUsers(ctx, [
							{
								accountId,
								publicName: index === 0 ? undefined : faker.person.fullName(),
							},
							otherAccount.id,
						]),
					),
				);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 4,
					options: { type: "connected" },
				});
				expect(result).toStrictEqual<typeof result>({
					items: connectedUserTuples.map(([user]) => user.id).sort(),
				});
			});

			test("users are sorted by debts amount", async ({ ctx }) => {
				const { id: otherAccountId } = await insertAccount(ctx);
				const { sessionId, accountId } = await insertAccountWithSession(ctx);

				// Verify other users don't affect our top users
				const { id: otherUserId } = await insertUser(ctx, otherAccountId);
				await insertDebt(ctx, otherAccountId, otherUserId);
				await insertDebt(ctx, otherAccountId, otherUserId);
				await insertDebt(ctx, otherAccountId, otherUserId);

				const { id: oneDebtUserId } = await insertUser(ctx, accountId);
				await insertDebt(ctx, accountId, oneDebtUserId);

				const [{ id: twoDebtsUserId }] = await insertConnectedUsers(ctx, [
					accountId,
					otherAccountId,
				]);
				await insertDebt(ctx, accountId, twoDebtsUserId);
				await insertDebt(ctx, accountId, twoDebtsUserId);

				const { id: threeDebtsUserId } = await insertUser(ctx, accountId);
				await insertDebt(ctx, accountId, threeDebtsUserId);
				await insertDebt(ctx, accountId, threeDebtsUserId);
				await insertDebt(ctx, accountId, threeDebtsUserId);

				const { id: zeroDebtsUserId } = await insertUser(ctx, accountId);
				const { id: lastZeroDebtsUserId } = await insertUser(ctx, accountId, {
					id: faker.string.uuid().replace(/^./g, "f"),
				});

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 4,
					options: { type: "not-connected" },
				});
				expect(result.items).toStrictEqual([
					threeDebtsUserId,
					oneDebtUserId,
					zeroDebtsUserId,
					lastZeroDebtsUserId,
				]);
			});

			test("limit is applied", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertUser(ctx, accountId);
				await insertUser(ctx, accountId);
				await insertUser(ctx, accountId);
				const limit = 2;
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit,
					options: { type: "not-connected" },
				});
				expect(result.items.length).toBe(limit);
			});

			test("returns users with no debts", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertUser(ctx, accountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
					options: { type: "not-connected" },
				});
				expect(result.items.length).toBe(1);
			});

			test("ignores users from filterIds", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertUser(ctx, accountId);
				const { id: ignoredUserId } = await insertUser(ctx, accountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
					filterIds: [ignoredUserId],
					options: { type: "not-connected" },
				});
				expect(result.items.length).toBe(1);
			});

			test("returns users based by debts created date", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: otherAccountId } = await insertAccount(ctx);
				const { id: oldDebtsUserId } = await insertUser(ctx, accountId);
				const { id: newDebtsUserId } = await insertUser(ctx, accountId);
				const [{ id: connectedUserId }] = await insertConnectedUsers(ctx, [
					accountId,
					otherAccountId,
				]);
				await insertDebt(ctx, accountId, oldDebtsUserId, {
					timestamp: new Date(Date.now() - MONTH),
				});
				await insertDebt(ctx, accountId, oldDebtsUserId, {
					timestamp: new Date(Date.now() - MONTH),
				});
				await insertDebt(ctx, accountId, newDebtsUserId);
				await insertDebt(ctx, accountId, connectedUserId);
				await insertDebt(ctx, accountId, connectedUserId);
				await insertDebt(ctx, accountId, connectedUserId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
					options: { type: "not-connected" },
				});
				expect(result.items).toStrictEqual([newDebtsUserId, oldDebtsUserId]);
			});
		});

		describe("not connected to receipt users", () => {
			test("returns top users", async ({ ctx }) => {
				const firstOtherAccount = await insertAccount(ctx);
				const secondOtherAccount = await insertAccount(ctx);
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);

				// Verify other receipts and users don't affect our top users
				await insertReceipt(ctx, firstOtherAccount.id);
				await insertUser(ctx, firstOtherAccount.id);

				const { id: participatingUserId } = await insertUser(ctx, accountId);
				const [{ id: participatingConnectedUserId }] =
					await insertConnectedUsers(ctx, [accountId, firstOtherAccount.id]);
				await insertReceiptParticipant(ctx, receiptId, participatingUserId);
				await insertReceiptParticipant(
					ctx,
					receiptId,
					participatingConnectedUserId,
				);
				const user = await insertUser(ctx, accountId);
				const publicNamedUser = await insertUser(ctx, accountId, {
					publicName: faker.person.fullName(),
				});
				const [connectedUser] = await insertConnectedUsers(ctx, [
					accountId,
					secondOtherAccount.id,
				]);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 4,
					options: { type: "not-connected-receipt", receiptId },
				});
				expect(result).toStrictEqual<typeof result>({
					items: [user, publicNamedUser, connectedUser]
						.map(({ id }) => id)
						.sort(),
				});
			});

			test("users are sorted by receipts amount and uuids", async ({ ctx }) => {
				const { id: otherAccountId } = await insertAccount(ctx);
				const { sessionId, accountId } = await insertAccountWithSession(ctx, {
					account: { id: faker.string.uuid().replace(/^./g, "f") },
				});

				// Verify other users don't affect our top users
				await insertUser(ctx, otherAccountId);
				await insertReceipt(ctx, otherAccountId);

				const { id: firstReceiptId } = await insertReceipt(ctx, accountId);
				const { id: secondReceiptId } = await insertReceipt(ctx, accountId);
				const { id: thirdReceiptId } = await insertReceipt(ctx, accountId);

				const { id: oneReceiptUserId } = await insertUser(ctx, accountId);
				await insertReceiptParticipant(ctx, firstReceiptId, oneReceiptUserId);

				const [{ id: twoReceiptsUserId }] = await insertConnectedUsers(ctx, [
					accountId,
					otherAccountId,
				]);
				await insertReceiptParticipant(ctx, firstReceiptId, twoReceiptsUserId);
				await insertReceiptParticipant(ctx, secondReceiptId, twoReceiptsUserId);

				const { id: threeReceiptsUserId } = await insertUser(ctx, accountId);
				await insertReceiptParticipant(
					ctx,
					firstReceiptId,
					threeReceiptsUserId,
				);
				await insertReceiptParticipant(
					ctx,
					secondReceiptId,
					threeReceiptsUserId,
				);
				await insertReceiptParticipant(
					ctx,
					thirdReceiptId,
					threeReceiptsUserId,
				);

				const { id: noReceiptsUserId } = await insertUser(ctx, accountId);

				const { id: otherReceiptId } = await insertReceipt(ctx, accountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 5,
					options: {
						type: "not-connected-receipt",
						receiptId: otherReceiptId,
					},
				});
				expect(result.items).toStrictEqual([
					threeReceiptsUserId,
					twoReceiptsUserId,
					oneReceiptUserId,
					noReceiptsUserId,
				]);
			});

			test("limit is applied", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertUser(ctx, accountId);
				await insertUser(ctx, accountId);
				await insertUser(ctx, accountId);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const limit = 2;
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit,
					options: {
						type: "not-connected-receipt",
						receiptId,
					},
				});
				expect(result.items.length).toBe(limit);
			});

			test("returns users that didn't participate in receipts", async ({
				ctx,
			}) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);
				await insertUser(ctx, accountId);
				const { id: otherReceiptId } = await insertReceipt(ctx, accountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
					filterIds: [selfUserId],
					options: {
						type: "not-connected-receipt",
						receiptId: otherReceiptId,
					},
				});
				expect(result.items.length).toBe(1);
			});

			test("returns users based by receipts created date", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);

				const { id: oldReceiptsUserId } = await insertUser(ctx, accountId);
				const { id: firstOldReceiptId } = await insertReceipt(ctx, accountId, {
					issued: new Date(Date.now() - MONTH),
				});
				await insertReceiptParticipant(
					ctx,
					firstOldReceiptId,
					oldReceiptsUserId,
				);
				const { id: secondOldReceiptId } = await insertReceipt(ctx, accountId, {
					issued: new Date(Date.now() - MONTH),
				});
				await insertReceiptParticipant(
					ctx,
					secondOldReceiptId,
					oldReceiptsUserId,
				);

				const { id: newReceiptsUserId } = await insertUser(ctx, accountId);
				const { id: firstNewReceiptId } = await insertReceipt(ctx, accountId);
				await insertReceiptParticipant(
					ctx,
					firstNewReceiptId,
					newReceiptsUserId,
				);

				const { id: otherReceiptId } = await insertReceipt(ctx, accountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
					filterIds: [selfUserId],
					options: {
						type: "not-connected-receipt",
						receiptId: otherReceiptId,
					},
				});
				expect(result.items).toStrictEqual([
					newReceiptsUserId,
					oldReceiptsUserId,
				]);
			});
		});

		test("doesn't return self user", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx, {
				user: { name: "Self Alice" },
			});
			const user = await insertUser(ctx, accountId, {
				name: "Alice from work",
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				limit: 10,
			});
			expect(result).toStrictEqual<typeof result>({
				items: [user.id],
			});
		});
	});
});
