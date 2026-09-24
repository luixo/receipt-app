import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertConnectedPeers,
	insertDebt,
	insertPeer,
	insertReceipt,
	insertReceiptItem,
	insertReceiptItemConsumer,
	insertReceiptItemPayer,
	insertReceiptParticipant,
	insertReceiptPayer,
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

const getItems = (
	items: Awaited<ReturnType<typeof insertReceiptItem>>[],
	consumers: Awaited<ReturnType<typeof insertReceiptItemConsumer>>[],
	payers: Awaited<ReturnType<typeof insertReceiptItemPayer>>[],
) =>
	items
		.map((item) => ({
			id: item.id,
			name: item.name,
			price: Number(item.price),
			quantity: Number(item.quantity),
			createdAt: item.createdAt,
			consumers: consumers
				.filter((consumer) => consumer.itemId === item.id)
				.map((consumer) => ({
					peerId: consumer.peerId,
					part: Number(consumer.part),
					createdAt: consumer.createdAt,
				}))
				.toSorted((a, b) => {
					const delta = Temporal.ZonedDateTime.compare(
						b.createdAt,
						a.createdAt,
					);
					return delta === 0 ? a.peerId.localeCompare(b.peerId) : delta;
				}),
			payers: payers
				.filter((payer) => payer.itemId === item.id)
				.map((payer) => ({
					peerId: payer.peerId,
					part: Number(payer.part),
					createdAt: payer.createdAt,
				}))
				.toSorted((a, b) => {
					const delta = Temporal.ZonedDateTime.compare(
						b.createdAt,
						a.createdAt,
					);
					return delta === 0 ? a.peerId.localeCompare(b.peerId) : delta;
				}),
		}))
		.toSorted((a, b) => {
			const delta = Temporal.ZonedDateTime.compare(b.createdAt, a.createdAt);
			return delta === 0 ? a.id.localeCompare(b.id) : delta;
		});

const getParticipants = (
	participants: Awaited<ReturnType<typeof insertReceiptParticipant>>[],
) =>
	participants
		.map((participant) => ({
			peerId: participant.peerId,
			role: participant.role,
			createdAt: participant.createdAt,
		}))
		.toSorted((a, b) => {
			const delta = Temporal.ZonedDateTime.compare(b.createdAt, a.createdAt);
			return delta === 0 ? a.peerId.localeCompare(b.peerId) : delta;
		});

const getPayers = (payers: Awaited<ReturnType<typeof insertReceiptPayer>>[]) =>
	payers
		.map((payer) => ({
			peerId: payer.peerId,
			part: Number(payer.part),
			createdAt: payer.createdAt,
		}))
		.toSorted((a, b) => {
			const delta = Temporal.ZonedDateTime.compare(b.createdAt, a.createdAt);
			return delta === 0 ? a.peerId.localeCompare(b.peerId) : delta;
		});

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receipts.get", () => {
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

		test("receipt not found", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);

			// Verifying adding other receipts doesn't affect the error
			await insertReceipt(ctx, userId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const fakeReceiptId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ id: fakeReceiptId }),
				"NOT_FOUND",
				`Receipt "${fakeReceiptId}" is not found.`,
			);
		});

		test("user has no role in the receipt", async ({ ctx }) => {
			const {
				sessionId,
				userId,
				user: { email },
			} = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx);
			await insertConnectedPeers(ctx, [userId, foreignUserId]);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: foreignReceiptId }),
				"FORBIDDEN",
				`User "${email}" has no access to receipt "${foreignReceiptId}"`,
			);
		});
	});

	describe("functionality", () => {
		describe("user is an owner", () => {
			test("empty receipt", async ({ ctx }) => {
				const {
					sessionId,
					userId,
					peerId: selfPeerId,
				} = await insertUserWithSession(ctx);
				const receipt = await insertReceipt(ctx, userId);

				// Verify other peers do not interfere
				const { id: foreignUserId } = await insertUser(ctx);
				await insertReceipt(ctx, foreignUserId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					createdAt: Temporal.Now.zonedDateTimeISO(),
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					ownerPeerId: selfPeerId,
					selfPeerId,
					items: [],
					participants: [],
					payers: [],
					debts: { direction: "outcoming", debts: [] },
				});
			});
		});

		test("user is a participant", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx);
			const [{ id: foreignPeerId }, { id: foreignToSelfPeerId }] =
				await insertConnectedPeers(ctx, [userId, foreignUserId]);
			const receipt = await insertReceipt(ctx, foreignUserId);
			const participant = await insertReceiptParticipant(
				ctx,
				receipt.id,
				foreignToSelfPeerId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ id: receipt.id });
			expect(result).toStrictEqual<typeof result>({
				id: receipt.id,
				createdAt: Temporal.Now.zonedDateTimeISO(),
				name: receipt.name,
				currencyCode: receipt.currencyCode,
				issued: receipt.issued,
				ownerPeerId: foreignPeerId,
				selfPeerId: foreignToSelfPeerId,
				items: [],
				participants: getParticipants([participant]),
				payers: [],
				debts: {
					direction: "incoming",
					hasMine: false,
					hasForeign: false,
					id: undefined,
				},
			});
		});

		describe("with connected debt", () => {
			test("incoming - has only theirs", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);
				const [{ id: foreignPeerId }, { id: foreignToSelfPeerId }] =
					await insertConnectedPeers(ctx, [userId, foreignUserId]);
				const receipt = await insertReceipt(ctx, foreignUserId);
				const participant = await insertReceiptParticipant(
					ctx,
					receipt.id,
					foreignToSelfPeerId,
				);
				const { id: foreignDebtId } = await insertDebt(
					ctx,
					foreignUserId,
					foreignToSelfPeerId,
					{ receiptId: receipt.id },
				);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					createdAt: Temporal.Now.zonedDateTimeISO(),
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					ownerPeerId: foreignPeerId,
					selfPeerId: foreignToSelfPeerId,
					debts: {
						direction: "incoming",
						hasMine: false,
						hasForeign: true,
						id: foreignDebtId,
					},
					items: [],
					payers: [],
					participants: getParticipants([participant]),
				});
			});

			test("incoming - has only ours", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);
				const [{ id: foreignPeerId }, { id: foreignToSelfPeerId }] =
					await insertConnectedPeers(ctx, [userId, foreignUserId]);
				const receipt = await insertReceipt(ctx, foreignUserId);
				const participant = await insertReceiptParticipant(
					ctx,
					receipt.id,
					foreignToSelfPeerId,
				);
				const { id: debtId } = await insertDebt(ctx, userId, foreignPeerId, {
					receiptId: receipt.id,
				});

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					createdAt: Temporal.Now.zonedDateTimeISO(),
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					ownerPeerId: foreignPeerId,
					selfPeerId: foreignToSelfPeerId,
					debts: {
						direction: "incoming",
						hasMine: true,
						hasForeign: false,
						id: debtId,
					},
					items: [],
					payers: [],
					participants: getParticipants([participant]),
				});
			});

			test("incoming - has both", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);
				const [{ id: foreignPeerId }, { id: foreignToSelfPeerId }] =
					await insertConnectedPeers(ctx, [userId, foreignUserId]);
				const receipt = await insertReceipt(ctx, foreignUserId);
				const participant = await insertReceiptParticipant(
					ctx,
					receipt.id,
					foreignToSelfPeerId,
				);
				const [{ id: debtId }] = await insertSyncedDebts(
					ctx,
					[foreignUserId, foreignToSelfPeerId, { receiptId: receipt.id }],
					[userId, foreignPeerId],
				);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					createdAt: Temporal.Now.zonedDateTimeISO(),
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					ownerPeerId: foreignPeerId,
					selfPeerId: foreignToSelfPeerId,
					debts: {
						direction: "incoming",
						hasMine: true,
						hasForeign: true,
						id: debtId,
					},
					items: [],
					payers: [],
					participants: getParticipants([participant]),
				});
			});

			test("outcoming", async ({ ctx }) => {
				const {
					sessionId,
					userId,
					peerId: selfPeerId,
				} = await insertUserWithSession(ctx);
				const receipt = await insertReceipt(ctx, userId);
				const { id: peerId } = await insertPeer(ctx, userId);
				const { id: anotherPeerId } = await insertPeer(ctx, userId);
				const debts = await Promise.all(
					[
						{
							promise: insertDebt(ctx, userId, peerId, {
								receiptId: receipt.id,
							}),
							peerId,
						},
						{
							promise: insertDebt(ctx, userId, anotherPeerId, {
								receiptId: receipt.id,
							}),
							peerId: anotherPeerId,
						},
					].map(async ({ promise, peerId: localPeerId }) => ({
						...(await promise),
						peerId: localPeerId,
					})),
				);

				// Verify other peers do not interfere
				const { id: foreignUserId } = await insertUser(ctx);
				await insertReceipt(ctx, foreignUserId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					createdAt: Temporal.Now.zonedDateTimeISO(),
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					ownerPeerId: selfPeerId,
					selfPeerId,
					debts: {
						direction: "outcoming",
						debts: debts
							.map((debt) => ({
								id: debt.id,
								peerId: debt.peerId,
							}))
							.toSorted((a, b) => a.id.localeCompare(b.id)),
					},
					items: [],
					participants: [],
					payers: [],
				});
			});
		});
	});

	describe("items functionality", () => {
		test("own receipt", async ({ ctx }) => {
			const {
				sessionId,
				userId,
				peerId: selfPeerId,
			} = await insertUserWithSession(ctx);
			const notConnectedPeer = await insertPeer(ctx, userId);
			const { id: foreignUserId } = await insertUser(ctx);
			const [foreignPeer] = await insertConnectedPeers(ctx, [
				userId,
				foreignUserId,
			]);
			const receipt = await insertReceipt(ctx, userId);
			const [selfParticipant, foreignParticipant, notConnectedParticipant] =
				await Promise.all([
					insertReceiptParticipant(ctx, receipt.id, selfPeerId),
					insertReceiptParticipant(ctx, receipt.id, foreignPeer.id),
					insertReceiptParticipant(ctx, receipt.id, notConnectedPeer.id),
				]);
			const receiptItems = await Promise.all([
				// item with multiple participants, with varied consumer parts
				insertReceiptItem(ctx, receipt.id),
				// item with 1 participant & multiple payers
				insertReceiptItem(ctx, receipt.id),
				// item with no participants & single payer
				insertReceiptItem(ctx, receipt.id),
			]);
			const consumers = await Promise.all([
				insertReceiptItemConsumer(
					ctx,
					receiptItems[0].id,
					selfParticipant.peerId,
					{ part: 2 },
				),
				insertReceiptItemConsumer(
					ctx,
					receiptItems[0].id,
					foreignParticipant.peerId,
				),
				insertReceiptItemConsumer(
					ctx,
					receiptItems[1].id,
					selfParticipant.peerId,
				),
				insertReceiptItemConsumer(
					ctx,
					receiptItems[2].id,
					notConnectedParticipant.peerId,
				),
			]);
			const payers = await Promise.all([
				insertReceiptItemPayer(
					ctx,
					receiptItems[1].id,
					notConnectedParticipant.peerId,
					{ part: 2 },
				),
				insertReceiptItemPayer(
					ctx,
					receiptItems[1].id,
					foreignParticipant.peerId,
				),
				insertReceiptItemPayer(
					ctx,
					receiptItems[2].id,
					foreignParticipant.peerId,
				),
			]);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ id: receipt.id });
			expect(result).toStrictEqual<typeof result>({
				id: receipt.id,
				createdAt: Temporal.Now.zonedDateTimeISO(),
				name: receipt.name,
				currencyCode: receipt.currencyCode,
				issued: receipt.issued,
				ownerPeerId: selfPeerId,
				selfPeerId,
				items: getItems(receiptItems, consumers, payers),
				participants: getParticipants([
					selfParticipant,
					foreignParticipant,
					notConnectedParticipant,
				]),
				payers: [],
				debts: { direction: "outcoming", debts: [] },
			});
		});

		test("own receipt - no participants", async ({ ctx }) => {
			const {
				sessionId,
				userId,
				peerId: selfPeerId,
			} = await insertUserWithSession(ctx);
			const receipt = await insertReceipt(ctx, userId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ id: receipt.id });
			expect(result).toStrictEqual<typeof result>({
				id: receipt.id,
				createdAt: Temporal.Now.zonedDateTimeISO(),
				name: receipt.name,
				currencyCode: receipt.currencyCode,
				issued: receipt.issued,
				ownerPeerId: selfPeerId,
				selfPeerId,
				items: [],
				participants: [],
				payers: [],
				debts: { direction: "outcoming", debts: [] },
			});
		});

		test("foreign receipt", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: connectedUserId } = await insertUser(ctx, {
				avatarUrl: null,
			});
			const { id: foreignUserId, peerId: foreignSelfPeerId } =
				await insertUser(ctx);
			const notConnectedPeer = await insertPeer(ctx, foreignUserId);
			const [foreignPeer, foreignToSelfPeer] = await insertConnectedPeers(ctx, [
				userId,
				foreignUserId,
			]);
			await insertConnectedPeers(ctx, [userId, connectedUserId]);
			const [foreignConnectedPeer] = await insertConnectedPeers(ctx, [
				foreignUserId,
				connectedUserId,
			]);
			const foreignPayerPeer = await insertPeer(ctx, foreignUserId);
			const receipt = await insertReceipt(ctx, foreignUserId);
			const [
				selfParticipant,
				foreignParticipant,
				notConnectedParticipant,
				connectedParticipant,
			] = await Promise.all([
				insertReceiptParticipant(ctx, receipt.id, foreignToSelfPeer.id, {
					role: "viewer",
				}),
				insertReceiptParticipant(ctx, receipt.id, foreignSelfPeerId, {
					createdAt: Temporal.Now.zonedDateTimeISO().subtract({
						milliseconds: 10,
					}),
				}),
				insertReceiptParticipant(ctx, receipt.id, notConnectedPeer.id, {
					createdAt: Temporal.Now.zonedDateTimeISO().subtract({
						milliseconds: 20,
					}),
				}),
				insertReceiptParticipant(ctx, receipt.id, foreignConnectedPeer.id),
			]);
			const [foreignPayer, connectedPayer, ownerPayer] = await Promise.all([
				insertReceiptPayer(ctx, receipt.id, foreignPayerPeer.id),
				insertReceiptPayer(ctx, receipt.id, foreignConnectedPeer.id, {
					createdAt: Temporal.Now.zonedDateTimeISO().subtract({
						milliseconds: 20,
					}),
				}),
				insertReceiptPayer(ctx, receipt.id, foreignSelfPeerId),
			]);
			const receiptItems = await Promise.all([
				// item with multiple participants, with varied consumer parts
				insertReceiptItem(ctx, receipt.id, {
					createdAt: Temporal.Now.zonedDateTimeISO().subtract({
						milliseconds: 20,
					}),
				}),
				// item with 1 participant & 1 payer
				insertReceiptItem(ctx, receipt.id, {
					createdAt: Temporal.Now.zonedDateTimeISO().subtract({
						milliseconds: 10,
					}),
				}),
				// item with no participants & multiple payers
				insertReceiptItem(ctx, receipt.id),
			]);
			const consumers = await Promise.all([
				insertReceiptItemConsumer(
					ctx,
					receiptItems[0].id,
					selfParticipant.peerId,
					{ part: 2 },
				),
				insertReceiptItemConsumer(
					ctx,
					receiptItems[0].id,
					foreignParticipant.peerId,
				),
				insertReceiptItemConsumer(
					ctx,
					receiptItems[0].id,
					connectedParticipant.peerId,
					{
						createdAt: Temporal.Now.zonedDateTimeISO().subtract({
							milliseconds: 20,
						}),
					},
				),
				insertReceiptItemConsumer(
					ctx,
					receiptItems[1].id,
					selfParticipant.peerId,
				),
				insertReceiptItemConsumer(
					ctx,
					receiptItems[2].id,
					notConnectedParticipant.peerId,
				),
			]);
			const payers = await Promise.all([
				insertReceiptItemPayer(
					ctx,
					receiptItems[1].id,
					notConnectedParticipant.peerId,
				),
				insertReceiptItemPayer(
					ctx,
					receiptItems[2].id,
					foreignParticipant.peerId,
				),
				insertReceiptItemPayer(
					ctx,
					receiptItems[2].id,
					notConnectedParticipant.peerId,
					{ part: 3 },
				),
			]);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ id: receipt.id });
			expect(result).toStrictEqual<typeof result>({
				id: receipt.id,
				createdAt: Temporal.Now.zonedDateTimeISO(),
				name: receipt.name,
				currencyCode: receipt.currencyCode,
				issued: receipt.issued,
				ownerPeerId: foreignPeer.id,
				selfPeerId: foreignToSelfPeer.id,
				items: getItems(receiptItems, consumers, payers),
				participants: getParticipants([
					selfParticipant,
					foreignParticipant,
					notConnectedParticipant,
					connectedParticipant,
				]),
				payers: getPayers([foreignPayer, connectedPayer, ownerPayer]),
				debts: {
					direction: "incoming",
					hasMine: false,
					hasForeign: false,
					id: undefined,
				},
			});
		});
	});
});
