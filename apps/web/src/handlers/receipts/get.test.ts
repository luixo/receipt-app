import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertReceipt,
	insertReceiptItem,
	insertReceiptItemConsumer,
	insertReceiptParticipant,
	insertSyncedDebts,
	insertUser,
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
	parts: Awaited<ReturnType<typeof insertReceiptItemConsumer>>[],
) =>
	items
		.map((item) => ({
			id: item.id,
			name: item.name,
			price: Number(item.price),
			quantity: Number(item.quantity),
			createdAt: item.createdAt,
			parts: parts
				.filter((part) => part.itemId === item.id)
				.map((part) => ({ userId: part.userId, part: Number(part.part) }))
				.sort((a, b) => a.userId.localeCompare(b.userId)),
		}))
		.sort((a, b) => {
			const bCreatedAt = b.createdAt.valueOf();
			const aCreatedAt = a.createdAt.valueOf();
			if (aCreatedAt === bCreatedAt) {
				return a.id.localeCompare(b.id);
			}
			return bCreatedAt - aCreatedAt;
		});

const getParticipants = (
	participants: Awaited<ReturnType<typeof insertReceiptParticipant>>[],
) =>
	participants
		.map((participant) => ({
			userId: participant.userId,
			role: participant.role,
			createdAt: participant.createdAt,
		}))
		.sort((a, b) => a.userId.localeCompare(b.userId));

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receipts.get", () => {
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
					`Zod error\n\nAt "id": Invalid uuid`,
				);
			});
		});

		test("receipt not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			// Verifying adding other receipts doesn't affect the error
			await insertReceipt(ctx, accountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
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

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: foreignReceiptId }),
				"FORBIDDEN",
				`Account "${email}" has no access to receipt "${foreignReceiptId}"`,
			);
		});
	});

	describe("functionality", () => {
		describe("account is an owner", () => {
			test("empty receipt", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);
				const receipt = await insertReceipt(ctx, accountId);

				// Verify other users do not interfere
				const { id: foreignAccountId } = await insertAccount(ctx);
				await insertReceipt(ctx, foreignAccountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					ownerUserId: selfUserId,
					selfUserId,
					items: [],
					participants: [],
					debt: { direction: "outcoming", ids: [] },
				});
			});
		});

		test("account is a participant", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: foreignUserId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const receipt = await insertReceipt(ctx, foreignAccountId);
			const participant = await insertReceiptParticipant(
				ctx,
				receipt.id,
				foreignToSelfUserId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ id: receipt.id });
			expect(result).toStrictEqual<typeof result>({
				id: receipt.id,
				name: receipt.name,
				currencyCode: receipt.currencyCode,
				issued: receipt.issued,
				ownerUserId: foreignUserId,
				selfUserId: foreignToSelfUserId,
				items: [],
				participants: getParticipants([participant]),
				debt: {
					direction: "incoming",
					hasMine: false,
					hasForeign: false,
					id: undefined,
				},
			});
		});

		describe("with connected debt", () => {
			test("incoming - has only theirs", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: foreignUserId }, { id: foreignToSelfUserId }] =
					await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
				const receipt = await insertReceipt(ctx, foreignAccountId);
				const participant = await insertReceiptParticipant(
					ctx,
					receipt.id,
					foreignToSelfUserId,
				);
				const { id: foreignDebtId } = await insertDebt(
					ctx,
					foreignAccountId,
					foreignToSelfUserId,
					{ receiptId: receipt.id },
				);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					ownerUserId: foreignUserId,
					selfUserId: foreignToSelfUserId,
					debt: {
						direction: "incoming",
						hasMine: false,
						hasForeign: true,
						id: foreignDebtId,
					},
					items: [],
					participants: getParticipants([participant]),
				});
			});

			test("incoming - has only ours", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: foreignUserId }, { id: foreignToSelfUserId }] =
					await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
				const receipt = await insertReceipt(ctx, foreignAccountId);
				const participant = await insertReceiptParticipant(
					ctx,
					receipt.id,
					foreignToSelfUserId,
				);
				const { id: debtId } = await insertDebt(ctx, accountId, foreignUserId, {
					receiptId: receipt.id,
				});

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					ownerUserId: foreignUserId,
					selfUserId: foreignToSelfUserId,
					debt: {
						direction: "incoming",
						hasMine: true,
						hasForeign: false,
						id: debtId,
					},
					items: [],
					participants: getParticipants([participant]),
				});
			});

			test("incoming - has both", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: foreignUserId }, { id: foreignToSelfUserId }] =
					await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
				const receipt = await insertReceipt(ctx, foreignAccountId);
				const participant = await insertReceiptParticipant(
					ctx,
					receipt.id,
					foreignToSelfUserId,
				);
				const [{ id: debtId }] = await insertSyncedDebts(
					ctx,
					[foreignAccountId, foreignToSelfUserId, { receiptId: receipt.id }],
					[accountId, foreignUserId],
				);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					ownerUserId: foreignUserId,
					selfUserId: foreignToSelfUserId,
					debt: {
						direction: "incoming",
						hasMine: true,
						hasForeign: true,
						id: debtId,
					},
					items: [],
					participants: getParticipants([participant]),
				});
			});

			test("outcoming", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);
				const receipt = await insertReceipt(ctx, accountId);
				const { id: userId } = await insertUser(ctx, accountId);
				const { id: anotherUserId } = await insertUser(ctx, accountId);
				const debts = await Promise.all([
					insertDebt(ctx, accountId, userId, { receiptId: receipt.id }),
					insertDebt(ctx, accountId, anotherUserId, { receiptId: receipt.id }),
				]);

				// Verify other users do not interfere
				const { id: foreignAccountId } = await insertAccount(ctx);
				await insertReceipt(ctx, foreignAccountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: receipt.id });
				expect(result).toStrictEqual<typeof result>({
					id: receipt.id,
					name: receipt.name,
					currencyCode: receipt.currencyCode,
					issued: receipt.issued,
					ownerUserId: selfUserId,
					selfUserId,
					debt: {
						direction: "outcoming",
						ids: debts.map((debt) => debt.id).sort(),
					},
					items: [],
					participants: [],
				});
			});
		});
	});

	describe("items functionality", () => {
		test("own receipt", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			const notConnectedUser = await insertUser(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [foreignUser] = await insertConnectedUsers(ctx, [
				accountId,
				foreignAccountId,
			]);
			const receipt = await insertReceipt(ctx, accountId);
			const [selfParticipant, foreignParticipant, notConnectedParticipant] =
				await Promise.all([
					insertReceiptParticipant(ctx, receipt.id, selfUserId),
					insertReceiptParticipant(ctx, receipt.id, foreignUser.id),
					insertReceiptParticipant(ctx, receipt.id, notConnectedUser.id),
				]);
			const receiptItems = await Promise.all([
				// item with multiple participants, with varied parts
				insertReceiptItem(ctx, receipt.id),
				// item with 1 participant
				insertReceiptItem(ctx, receipt.id),
				// item with no participants
				insertReceiptItem(ctx, receipt.id),
			]);
			const parts = await Promise.all([
				insertReceiptItemConsumer(
					ctx,
					receiptItems[0].id,
					selfParticipant.userId,
					{
						part: 2,
					},
				),
				insertReceiptItemConsumer(
					ctx,
					receiptItems[0].id,
					foreignParticipant.userId,
				),
				insertReceiptItemConsumer(
					ctx,
					receiptItems[1].id,
					selfParticipant.userId,
				),
				insertReceiptItemConsumer(
					ctx,
					receiptItems[2].id,
					notConnectedParticipant.userId,
				),
			]);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ id: receipt.id });
			expect(result).toStrictEqual<typeof result>({
				id: receipt.id,
				name: receipt.name,
				currencyCode: receipt.currencyCode,
				issued: receipt.issued,
				ownerUserId: selfUserId,
				selfUserId,
				items: getItems(receiptItems, parts),
				participants: getParticipants([
					selfParticipant,
					foreignParticipant,
					notConnectedParticipant,
				]),
				debt: { direction: "outcoming", ids: [] },
			});
		});

		test("own receipt - no participants", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			const receipt = await insertReceipt(ctx, accountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ id: receipt.id });
			expect(result).toStrictEqual<typeof result>({
				id: receipt.id,
				name: receipt.name,
				currencyCode: receipt.currencyCode,
				issued: receipt.issued,
				ownerUserId: selfUserId,
				selfUserId,
				items: [],
				participants: [],
				debt: { direction: "outcoming", ids: [] },
			});
		});

		test("foreign receipt", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: connectedAccountId } = await insertAccount(ctx, {
				avatarUrl: null,
			});
			const { id: foreignAccountId, userId: foreignSelfUserId } =
				await insertAccount(ctx);
			const notConnectedUser = await insertUser(ctx, foreignAccountId);
			const [foreignUser, foreignToSelfUser] = await insertConnectedUsers(ctx, [
				accountId,
				foreignAccountId,
			]);
			await insertConnectedUsers(ctx, [accountId, connectedAccountId]);
			const [foreignConnectedUser] = await insertConnectedUsers(ctx, [
				foreignAccountId,
				connectedAccountId,
			]);
			const receipt = await insertReceipt(ctx, foreignAccountId);
			const [
				selfParticipant,
				foreignParticipant,
				notConnectedParticipant,
				connectedParticipant,
			] = await Promise.all([
				insertReceiptParticipant(ctx, receipt.id, foreignToSelfUser.id, {
					role: "viewer",
				}),
				insertReceiptParticipant(ctx, receipt.id, foreignSelfUserId),
				insertReceiptParticipant(ctx, receipt.id, notConnectedUser.id),
				insertReceiptParticipant(ctx, receipt.id, foreignConnectedUser.id),
			]);
			const receiptItems = await Promise.all([
				// item with multiple participants, with varied parts
				insertReceiptItem(ctx, receipt.id, {
					createdAt: new Date(Date.now() - 20),
				}),
				// item with 1 participant
				insertReceiptItem(ctx, receipt.id, {
					createdAt: new Date(Date.now() - 10),
				}),
				// item with no participants
				insertReceiptItem(ctx, receipt.id),
			]);
			const parts = await Promise.all([
				insertReceiptItemConsumer(
					ctx,
					receiptItems[0].id,
					selfParticipant.userId,
					{
						part: 2,
					},
				),
				insertReceiptItemConsumer(
					ctx,
					receiptItems[0].id,
					foreignParticipant.userId,
				),
				insertReceiptItemConsumer(
					ctx,
					receiptItems[0].id,
					connectedParticipant.userId,
				),
				insertReceiptItemConsumer(
					ctx,
					receiptItems[1].id,
					selfParticipant.userId,
				),
				insertReceiptItemConsumer(
					ctx,
					receiptItems[2].id,
					notConnectedParticipant.userId,
				),
			]);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ id: receipt.id });
			expect(result).toStrictEqual<typeof result>({
				id: receipt.id,
				name: receipt.name,
				currencyCode: receipt.currencyCode,
				issued: receipt.issued,
				ownerUserId: foreignUser.id,
				selfUserId: foreignToSelfUser.id,
				items: getItems(receiptItems, parts),
				participants: getParticipants([
					selfParticipant,
					foreignParticipant,
					notConnectedParticipant,
					connectedParticipant,
				]),
				debt: {
					direction: "incoming",
					hasMine: false,
					hasForeign: false,
					id: undefined,
				},
			});
		});
	});
});
