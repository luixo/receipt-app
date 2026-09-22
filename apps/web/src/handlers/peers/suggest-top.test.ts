import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { MAX_LIMIT } from "~app/utils/validation";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedPeers,
	insertDebt,
	insertPeer,
	insertReceipt,
	insertReceiptParticipant,
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
				const { sessionId } = await insertAccountWithSession(ctx);
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
				const { sessionId } = await insertAccountWithSession(ctx);
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
				const { sessionId } = await insertAccountWithSession(ctx);
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
				const { sessionId } = await insertAccountWithSession(ctx);
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
					`Zod error\n\nAt "options.receiptId": Invalid UUID`,
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
			test("returns top peers", async ({ ctx }) => {
				const otherAccount = await insertAccount(ctx);
				const { sessionId, accountId } = await insertAccountWithSession(ctx);

				const secondAccount = await insertAccount(ctx);

				// Verify other peers don't affect our top peers
				await insertPeer(ctx, otherAccount.id);

				const peer = await insertPeer(ctx, accountId);
				const [connectedPeer] = await insertConnectedPeers(ctx, [
					accountId,
					otherAccount.id,
				]);
				const publicNamedPeer = await insertPeer(ctx, accountId, {
					publicName: faker.person.fullName(),
				});
				const [connectedPublicNamedPeer] = await insertConnectedPeers(ctx, [
					{ accountId, publicName: faker.person.fullName() },
					secondAccount.id,
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
				const { id: otherAccountId } = await insertAccount(ctx);
				const { sessionId, accountId } = await insertAccountWithSession(ctx);

				// Verify other peers don't affect our top peers
				const { id: otherPeerId } = await insertPeer(ctx, otherAccountId);
				await insertDebt(ctx, accountId, otherPeerId);
				await insertDebt(ctx, accountId, otherPeerId);
				await insertDebt(ctx, accountId, otherPeerId);

				const { id: oneDebtPeerId } = await insertPeer(ctx, accountId);
				const [{ id: twoDebtsPeerId }] = await insertConnectedPeers(ctx, [
					accountId,
					otherAccountId,
				]);
				const { id: threeDebtsPeerId } = await insertPeer(ctx, accountId);
				const { id: zeroDebtsPeerId } = await insertPeer(ctx, accountId);
				const { id: lastZeroDebtsPeerId } = await insertPeer(ctx, accountId, {
					id: faker.string.uuid().replaceAll(/^./g, "f"),
				});

				await insertDebt(ctx, accountId, oneDebtPeerId);
				await insertDebt(ctx, accountId, twoDebtsPeerId);
				await insertDebt(ctx, accountId, twoDebtsPeerId);
				await insertDebt(ctx, accountId, threeDebtsPeerId);
				await insertDebt(ctx, accountId, threeDebtsPeerId);
				await insertDebt(ctx, accountId, threeDebtsPeerId);

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
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertPeer(ctx, accountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
				});
				expect(result.items).toHaveLength(1);
			});

			test("limit is applied", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertPeer(ctx, accountId);
				await insertPeer(ctx, accountId);
				await insertPeer(ctx, accountId);
				const limit = 2;
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit,
				});
				expect(result.items).toHaveLength(limit);
			});

			test("ignores peers from filterIds", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertPeer(ctx, accountId);
				const { id: ignoredPeerId } = await insertPeer(ctx, accountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
					filterIds: [ignoredPeerId],
				});
				expect(result.items).toHaveLength(1);
			});

			test("returns peers based by debts created date", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: oldDebtsPeerId } = await insertPeer(ctx, accountId);
				const { id: newDebtsPeerId } = await insertPeer(ctx, accountId);
				const twoMonthAgo = Temporal.Now.plainDateISO().subtract({
					months: 2,
				});
				await insertDebt(ctx, accountId, oldDebtsPeerId, {
					timestamp: twoMonthAgo,
				});
				await insertDebt(ctx, accountId, oldDebtsPeerId, {
					timestamp: twoMonthAgo,
				});
				await insertDebt(ctx, accountId, newDebtsPeerId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
				});
				expect(result.items).toStrictEqual([newDebtsPeerId, oldDebtsPeerId]);
			});
		});

		describe("(not) connected peers", () => {
			test("returns top peers", async ({ ctx }) => {
				const { id: otherAccountId } = await insertAccount(ctx);
				const { sessionId, accountId } = await insertAccountWithSession(ctx);

				// Verify other peers don't affect our top peers
				await insertPeer(ctx, otherAccountId);

				const peer = await insertPeer(ctx, accountId);
				const publicNamedPeer = await insertPeer(ctx, accountId, {
					publicName: faker.person.fullName(),
				});
				await insertConnectedPeers(ctx, [accountId, otherAccountId]);

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
				const { id: otherAccountId } = await insertAccount(ctx);
				const { sessionId, accountId } = await insertAccountWithSession(ctx);

				// Verify other peers don't affect our top peers
				const { id: otherPeerId } = await insertPeer(ctx, otherAccountId);
				await insertDebt(ctx, otherAccountId, otherPeerId);
				await insertDebt(ctx, otherAccountId, otherPeerId);
				await insertDebt(ctx, otherAccountId, otherPeerId);

				const { id: oneDebtPeerId } = await insertPeer(ctx, accountId);
				await insertDebt(ctx, accountId, oneDebtPeerId);

				const [{ id: twoDebtsPeerId }] = await insertConnectedPeers(ctx, [
					accountId,
					otherAccountId,
				]);
				await insertDebt(ctx, accountId, twoDebtsPeerId);
				await insertDebt(ctx, accountId, twoDebtsPeerId);

				const { id: threeDebtsPeerId } = await insertPeer(ctx, accountId);
				await insertDebt(ctx, accountId, threeDebtsPeerId);
				await insertDebt(ctx, accountId, threeDebtsPeerId);
				await insertDebt(ctx, accountId, threeDebtsPeerId);

				const { id: zeroDebtsPeerId } = await insertPeer(ctx, accountId);
				const { id: lastZeroDebtsPeerId } = await insertPeer(ctx, accountId, {
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
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertPeer(ctx, accountId);
				await insertPeer(ctx, accountId);
				await insertPeer(ctx, accountId);
				const limit = 2;
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit,
					options: { type: "not-connected" },
				});
				expect(result.items).toHaveLength(limit);
			});

			test("returns peers with no debts", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertPeer(ctx, accountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
					options: { type: "not-connected" },
				});
				expect(result.items).toHaveLength(1);
			});

			test("ignores peers from filterIds", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertPeer(ctx, accountId);
				const { id: ignoredPeerId } = await insertPeer(ctx, accountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({
					limit: 10,
					filterIds: [ignoredPeerId],
					options: { type: "not-connected" },
				});
				expect(result.items).toHaveLength(1);
			});

			test("returns peers based by debts created date", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: otherAccountId } = await insertAccount(ctx);
				const { id: oldDebtsPeerId } = await insertPeer(ctx, accountId);
				const { id: newDebtsPeerId } = await insertPeer(ctx, accountId);
				const [{ id: connectedPeerId }] = await insertConnectedPeers(ctx, [
					accountId,
					otherAccountId,
				]);
				const monthAgo = Temporal.Now.plainDateISO().subtract({ months: 1 });
				await insertDebt(ctx, accountId, oldDebtsPeerId, {
					timestamp: monthAgo,
				});
				await insertDebt(ctx, accountId, oldDebtsPeerId, {
					timestamp: monthAgo,
				});
				await insertDebt(ctx, accountId, newDebtsPeerId);
				await insertDebt(ctx, accountId, connectedPeerId);
				await insertDebt(ctx, accountId, connectedPeerId);
				await insertDebt(ctx, accountId, connectedPeerId);
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
				const firstOtherAccount = await insertAccount(ctx);
				const secondOtherAccount = await insertAccount(ctx);
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);

				// Verify other receipts and peers don't affect our top peers
				await insertReceipt(ctx, firstOtherAccount.id);
				await insertPeer(ctx, firstOtherAccount.id);

				const { id: participatingPeerId } = await insertPeer(ctx, accountId);
				const [{ id: participatingConnectedPeerId }] =
					await insertConnectedPeers(ctx, [accountId, firstOtherAccount.id]);
				await insertReceiptParticipant(ctx, receiptId, participatingPeerId);
				await insertReceiptParticipant(
					ctx,
					receiptId,
					participatingConnectedPeerId,
				);
				const peer = await insertPeer(ctx, accountId);
				const publicNamedPeer = await insertPeer(ctx, accountId, {
					publicName: faker.person.fullName(),
				});
				const [connectedPeer] = await insertConnectedPeers(ctx, [
					accountId,
					secondOtherAccount.id,
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
				const { id: otherAccountId } = await insertAccount(ctx);
				const { sessionId, accountId } = await insertAccountWithSession(ctx, {
					account: { id: faker.string.uuid().replaceAll(/^./g, "f") },
				});

				// Verify other peers don't affect our top peers
				await insertPeer(ctx, otherAccountId);
				await insertReceipt(ctx, otherAccountId);

				const { id: firstReceiptId } = await insertReceipt(ctx, accountId);
				const { id: secondReceiptId } = await insertReceipt(ctx, accountId);
				const { id: thirdReceiptId } = await insertReceipt(ctx, accountId);

				const { id: oneReceiptPeerId } = await insertPeer(ctx, accountId);
				await insertReceiptParticipant(ctx, firstReceiptId, oneReceiptPeerId);

				const [{ id: twoReceiptsPeerId }] = await insertConnectedPeers(ctx, [
					accountId,
					otherAccountId,
				]);
				await insertReceiptParticipant(ctx, firstReceiptId, twoReceiptsPeerId);
				await insertReceiptParticipant(ctx, secondReceiptId, twoReceiptsPeerId);

				const { id: threeReceiptsPeerId } = await insertPeer(ctx, accountId);
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

				const { id: noReceiptsPeerId } = await insertPeer(ctx, accountId);

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
					threeReceiptsPeerId,
					twoReceiptsPeerId,
					oneReceiptPeerId,
					noReceiptsPeerId,
				]);
			});

			test("limit is applied", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertPeer(ctx, accountId);
				await insertPeer(ctx, accountId);
				await insertPeer(ctx, accountId);
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
				expect(result.items).toHaveLength(limit);
			});

			test("returns peers that didn't participate in receipts", async ({
				ctx,
			}) => {
				const {
					sessionId,
					accountId,
					peerId: selfPeerId,
				} = await insertAccountWithSession(ctx);
				await insertPeer(ctx, accountId);
				const { id: otherReceiptId } = await insertReceipt(ctx, accountId);
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
					accountId,
					peerId: selfPeerId,
				} = await insertAccountWithSession(ctx);

				const monthAgo = Temporal.Now.plainDateISO().subtract({ months: 1 });
				const { id: oldReceiptsPeerId } = await insertPeer(ctx, accountId);
				const { id: firstOldReceiptId } = await insertReceipt(ctx, accountId, {
					issued: monthAgo,
				});
				await insertReceiptParticipant(
					ctx,
					firstOldReceiptId,
					oldReceiptsPeerId,
				);
				const { id: secondOldReceiptId } = await insertReceipt(ctx, accountId, {
					issued: monthAgo,
				});
				await insertReceiptParticipant(
					ctx,
					secondOldReceiptId,
					oldReceiptsPeerId,
				);

				const { id: newReceiptsPeerId } = await insertPeer(ctx, accountId);
				const { id: firstNewReceiptId } = await insertReceipt(ctx, accountId);
				await insertReceiptParticipant(
					ctx,
					firstNewReceiptId,
					newReceiptsPeerId,
				);

				const { id: otherReceiptId } = await insertReceipt(ctx, accountId);
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
			const { sessionId, accountId } = await insertAccountWithSession(ctx, {
				peer: { name: "Self Alice" },
			});
			const peer = await insertPeer(ctx, accountId, {
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
