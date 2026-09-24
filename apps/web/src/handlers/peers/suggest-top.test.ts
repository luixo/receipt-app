import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { MAX_LIMIT } from "~app/utils/validation";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertConnectedPeers,
	insertDebt,
	insertPeer,
	insertReceipt,
	insertReceiptParticipant,
	insertUser,
	insertUserWithSession,
} from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./suggest-top";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("peers.suggestTop", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				limit: 1,
			}),
		);

		describe("limit", () => {
			test("is <= 0", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							limit: 0,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too small: expected number to be >0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							limit: MAX_LIMIT + 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too big: expected number to be <=100`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							limit: faker.number.float(),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Invalid input: expected int, received number`,
				);
			});
		});

		describe("filtered ids", () => {
			test("has non-uuid values", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							limit: 1,
							filterIds: [faker.string.alpha()],
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "filterIds[0]": Invalid UUID`,
				);
			});
		});

		describe("non-connected receipt id", () => {
			test("has non-uuid value", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
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
					`Zod error\n\nAt "options.receiptId": Invalid UUID`,
				);
			});
		});

		test("receipt does not exist", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			// Verifying adding other receipts don't affect the error
			await insertReceipt(ctx, userId);
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
			const { sessionId } = await insertUserWithSession(ctx);
			const { id: otherUserId } = await insertUser(ctx);
			const { id: receiptId } = await insertReceipt(ctx, otherUserId);
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
			test("returns top peers", async ({ ctx }) => {
				const otherUser = await insertUser(ctx);
				const { sessionId, userId } = await insertUserWithSession(ctx);

				const secondUser = await insertUser(ctx);

				// Verify other peers don't affect our top peers
				await insertPeer(ctx, otherUser.id);

				const peer = await insertPeer(ctx, userId);
				const [connectedPeer] = await insertConnectedPeers(ctx, [
					userId,
					otherUser.id,
				]);
				const publicNamedPeer = await insertPeer(ctx, userId, {
					publicName: faker.person.fullName(),
				});
				const [connectedPublicNamedPeer] = await insertConnectedPeers(ctx, [
					{ userId, publicName: faker.person.fullName() },
					secondUser.id,
				]);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 4,
				});
				expect(result).toStrictEqual<typeof result>({
					items: [
						peer,
						connectedPeer,
						connectedPublicNamedPeer,
						publicNamedPeer,
					]
						.map(({ id }) => id)
						.toSorted(),
				});
			});

			test("peers are sorted by debts amount and by uuid", async ({ ctx }) => {
				const { id: otherUserId } = await insertUser(ctx);
				const { sessionId, userId } = await insertUserWithSession(ctx);

				// Verify other peers don't affect our top peers
				const { id: otherPeerId } = await insertPeer(ctx, otherUserId);
				await insertDebt(ctx, userId, otherPeerId);
				await insertDebt(ctx, userId, otherPeerId);
				await insertDebt(ctx, userId, otherPeerId);

				const { id: oneDebtPeerId } = await insertPeer(ctx, userId);
				const [{ id: twoDebtsPeerId }] = await insertConnectedPeers(ctx, [
					userId,
					otherUserId,
				]);
				const { id: threeDebtsPeerId } = await insertPeer(ctx, userId);
				const { id: zeroDebtsPeerId } = await insertPeer(ctx, userId);
				const { id: lastZeroDebtsPeerId } = await insertPeer(ctx, userId, {
					id: faker.string.uuid().replaceAll(/^./g, "f"),
				});

				await insertDebt(ctx, userId, oneDebtPeerId);
				await insertDebt(ctx, userId, twoDebtsPeerId);
				await insertDebt(ctx, userId, twoDebtsPeerId);
				await insertDebt(ctx, userId, threeDebtsPeerId);
				await insertDebt(ctx, userId, threeDebtsPeerId);
				await insertDebt(ctx, userId, threeDebtsPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 5,
				});
				expect(result.items).toStrictEqual([
					threeDebtsPeerId,
					twoDebtsPeerId,
					oneDebtPeerId,
					zeroDebtsPeerId,
					lastZeroDebtsPeerId,
				]);
			});

			test("returns peers with no debts", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				await insertPeer(ctx, userId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
				});
				expect(result.items).toHaveLength(1);
			});

			test("limit is applied", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				await insertPeer(ctx, userId);
				await insertPeer(ctx, userId);
				await insertPeer(ctx, userId);
				const limit = 2;
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit,
				});
				expect(result.items).toHaveLength(limit);
			});

			test("ignores peers from filterIds", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				await insertPeer(ctx, userId);
				const { id: ignoredPeerId } = await insertPeer(ctx, userId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
					filterIds: [ignoredPeerId],
				});
				expect(result.items).toHaveLength(1);
			});

			test("returns peers based by debts created date", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: oldDebtsPeerId } = await insertPeer(ctx, userId);
				const { id: newDebtsPeerId } = await insertPeer(ctx, userId);
				const twoMonthAgo = Temporal.Now.plainDateISO().subtract({
					months: 2,
				});
				await insertDebt(ctx, userId, oldDebtsPeerId, {
					timestamp: twoMonthAgo,
				});
				await insertDebt(ctx, userId, oldDebtsPeerId, {
					timestamp: twoMonthAgo,
				});
				await insertDebt(ctx, userId, newDebtsPeerId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
				});
				expect(result.items).toStrictEqual([newDebtsPeerId, oldDebtsPeerId]);
			});
		});

		describe("(not) connected peers", () => {
			test("returns top peers", async ({ ctx }) => {
				const { id: otherUserId } = await insertUser(ctx);
				const { sessionId, userId } = await insertUserWithSession(ctx);

				// Verify other peers don't affect our top peers
				await insertPeer(ctx, otherUserId);

				const peer = await insertPeer(ctx, userId);
				const publicNamedPeer = await insertPeer(ctx, userId, {
					publicName: faker.person.fullName(),
				});
				await insertConnectedPeers(ctx, [userId, otherUserId]);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 4,
					options: { type: "not-connected" },
				});
				expect(result).toStrictEqual<typeof result>({
					items: [peer, publicNamedPeer].map(({ id }) => id).toSorted(),
				});
			});

			test("peers are sorted by debts amount", async ({ ctx }) => {
				const { id: otherUserId } = await insertUser(ctx);
				const { sessionId, userId } = await insertUserWithSession(ctx);

				// Verify other peers don't affect our top peers
				const { id: otherPeerId } = await insertPeer(ctx, otherUserId);
				await insertDebt(ctx, otherUserId, otherPeerId);
				await insertDebt(ctx, otherUserId, otherPeerId);
				await insertDebt(ctx, otherUserId, otherPeerId);

				const { id: oneDebtPeerId } = await insertPeer(ctx, userId);
				await insertDebt(ctx, userId, oneDebtPeerId);

				const [{ id: twoDebtsPeerId }] = await insertConnectedPeers(ctx, [
					userId,
					otherUserId,
				]);
				await insertDebt(ctx, userId, twoDebtsPeerId);
				await insertDebt(ctx, userId, twoDebtsPeerId);

				const { id: threeDebtsPeerId } = await insertPeer(ctx, userId);
				await insertDebt(ctx, userId, threeDebtsPeerId);
				await insertDebt(ctx, userId, threeDebtsPeerId);
				await insertDebt(ctx, userId, threeDebtsPeerId);

				const { id: zeroDebtsPeerId } = await insertPeer(ctx, userId);
				const { id: lastZeroDebtsPeerId } = await insertPeer(ctx, userId, {
					id: faker.string.uuid().replaceAll(/^./g, "f"),
				});

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 4,
					options: { type: "not-connected" },
				});
				expect(result.items).toStrictEqual([
					threeDebtsPeerId,
					oneDebtPeerId,
					zeroDebtsPeerId,
					lastZeroDebtsPeerId,
				]);
			});

			test("limit is applied", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				await insertPeer(ctx, userId);
				await insertPeer(ctx, userId);
				await insertPeer(ctx, userId);
				const limit = 2;
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit,
					options: { type: "not-connected" },
				});
				expect(result.items).toHaveLength(limit);
			});

			test("returns peers with no debts", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				await insertPeer(ctx, userId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
					options: { type: "not-connected" },
				});
				expect(result.items).toHaveLength(1);
			});

			test("ignores peers from filterIds", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				await insertPeer(ctx, userId);
				const { id: ignoredPeerId } = await insertPeer(ctx, userId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
					filterIds: [ignoredPeerId],
					options: { type: "not-connected" },
				});
				expect(result.items).toHaveLength(1);
			});

			test("returns peers based by debts created date", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: otherUserId } = await insertUser(ctx);
				const { id: oldDebtsPeerId } = await insertPeer(ctx, userId);
				const { id: newDebtsPeerId } = await insertPeer(ctx, userId);
				const [{ id: connectedPeerId }] = await insertConnectedPeers(ctx, [
					userId,
					otherUserId,
				]);
				const monthAgo = Temporal.Now.plainDateISO().subtract({ months: 1 });
				await insertDebt(ctx, userId, oldDebtsPeerId, {
					timestamp: monthAgo,
				});
				await insertDebt(ctx, userId, oldDebtsPeerId, {
					timestamp: monthAgo,
				});
				await insertDebt(ctx, userId, newDebtsPeerId);
				await insertDebt(ctx, userId, connectedPeerId);
				await insertDebt(ctx, userId, connectedPeerId);
				await insertDebt(ctx, userId, connectedPeerId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
					options: { type: "not-connected" },
				});
				expect(result.items).toStrictEqual([newDebtsPeerId, oldDebtsPeerId]);
			});
		});

		describe("not connected to receipt peers", () => {
			test("returns top peers", async ({ ctx }) => {
				const firstOtherUser = await insertUser(ctx);
				const secondOtherUser = await insertUser(ctx);
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, userId);

				// Verify other receipts and peers don't affect our top peers
				await insertReceipt(ctx, firstOtherUser.id);
				await insertPeer(ctx, firstOtherUser.id);

				const { id: participatingPeerId } = await insertPeer(ctx, userId);
				const [{ id: participatingConnectedPeerId }] =
					await insertConnectedPeers(ctx, [userId, firstOtherUser.id]);
				await insertReceiptParticipant(ctx, receiptId, participatingPeerId);
				await insertReceiptParticipant(
					ctx,
					receiptId,
					participatingConnectedPeerId,
				);
				const peer = await insertPeer(ctx, userId);
				const publicNamedPeer = await insertPeer(ctx, userId, {
					publicName: faker.person.fullName(),
				});
				const [connectedPeer] = await insertConnectedPeers(ctx, [
					userId,
					secondOtherUser.id,
				]);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 4,
					options: { type: "not-connected-receipt", receiptId },
				});
				expect(result).toStrictEqual<typeof result>({
					items: [peer, publicNamedPeer, connectedPeer]
						.map(({ id }) => id)
						.toSorted(),
				});
			});

			test("peers are sorted by receipts amount and uuids", async ({ ctx }) => {
				const { id: otherUserId } = await insertUser(ctx);
				const { sessionId, userId } = await insertUserWithSession(ctx, {
					user: { id: faker.string.uuid().replaceAll(/^./g, "f") },
				});

				// Verify other peers don't affect our top peers
				await insertPeer(ctx, otherUserId);
				await insertReceipt(ctx, otherUserId);

				const { id: firstReceiptId } = await insertReceipt(ctx, userId);
				const { id: secondReceiptId } = await insertReceipt(ctx, userId);
				const { id: thirdReceiptId } = await insertReceipt(ctx, userId);

				const { id: oneReceiptPeerId } = await insertPeer(ctx, userId);
				await insertReceiptParticipant(ctx, firstReceiptId, oneReceiptPeerId);

				const [{ id: twoReceiptsPeerId }] = await insertConnectedPeers(ctx, [
					userId,
					otherUserId,
				]);
				await insertReceiptParticipant(ctx, firstReceiptId, twoReceiptsPeerId);
				await insertReceiptParticipant(ctx, secondReceiptId, twoReceiptsPeerId);

				const { id: threeReceiptsPeerId } = await insertPeer(ctx, userId);
				await insertReceiptParticipant(
					ctx,
					firstReceiptId,
					threeReceiptsPeerId,
				);
				await insertReceiptParticipant(
					ctx,
					secondReceiptId,
					threeReceiptsPeerId,
				);
				await insertReceiptParticipant(
					ctx,
					thirdReceiptId,
					threeReceiptsPeerId,
				);

				const { id: noReceiptsPeerId } = await insertPeer(ctx, userId);

				const { id: otherReceiptId } = await insertReceipt(ctx, userId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 5,
					options: {
						type: "not-connected-receipt",
						receiptId: otherReceiptId,
					},
				});
				expect(result.items).toStrictEqual([
					threeReceiptsPeerId,
					twoReceiptsPeerId,
					oneReceiptPeerId,
					noReceiptsPeerId,
				]);
			});

			test("limit is applied", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				await insertPeer(ctx, userId);
				await insertPeer(ctx, userId);
				await insertPeer(ctx, userId);
				const { id: receiptId } = await insertReceipt(ctx, userId);
				const limit = 2;
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit,
					options: {
						type: "not-connected-receipt",
						receiptId,
					},
				});
				expect(result.items).toHaveLength(limit);
			});

			test("returns peers that didn't participate in receipts", async ({
				ctx,
			}) => {
				const {
					sessionId,
					userId,
					peerId: selfPeerId,
				} = await insertUserWithSession(ctx);
				await insertPeer(ctx, userId);
				const { id: otherReceiptId } = await insertReceipt(ctx, userId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
					filterIds: [selfPeerId],
					options: {
						type: "not-connected-receipt",
						receiptId: otherReceiptId,
					},
				});
				expect(result.items).toHaveLength(1);
			});

			test("returns peers based by receipts created date", async ({ ctx }) => {
				const {
					sessionId,
					userId,
					peerId: selfPeerId,
				} = await insertUserWithSession(ctx);

				const monthAgo = Temporal.Now.plainDateISO().subtract({ months: 1 });
				const { id: oldReceiptsPeerId } = await insertPeer(ctx, userId);
				const { id: firstOldReceiptId } = await insertReceipt(ctx, userId, {
					issued: monthAgo,
				});
				await insertReceiptParticipant(
					ctx,
					firstOldReceiptId,
					oldReceiptsPeerId,
				);
				const { id: secondOldReceiptId } = await insertReceipt(ctx, userId, {
					issued: monthAgo,
				});
				await insertReceiptParticipant(
					ctx,
					secondOldReceiptId,
					oldReceiptsPeerId,
				);

				const { id: newReceiptsPeerId } = await insertPeer(ctx, userId);
				const { id: firstNewReceiptId } = await insertReceipt(ctx, userId);
				await insertReceiptParticipant(
					ctx,
					firstNewReceiptId,
					newReceiptsPeerId,
				);

				const { id: otherReceiptId } = await insertReceipt(ctx, userId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
					filterIds: [selfPeerId],
					options: {
						type: "not-connected-receipt",
						receiptId: otherReceiptId,
					},
				});
				expect(result.items).toStrictEqual([
					newReceiptsPeerId,
					oldReceiptsPeerId,
				]);
			});
		});

		test("doesn't return self peer", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx, {
				peer: { name: "Self Alice" },
			});
			const peer = await insertPeer(ctx, userId, {
				name: "Alice from work",
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				limit: 10,
			});
			expect(result).toStrictEqual<typeof result>({
				items: [peer.id],
			});
		});
	});
});
