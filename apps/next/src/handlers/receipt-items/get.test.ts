import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertItemParticipant,
	insertReceipt,
	insertReceiptItem,
	insertReceiptParticipant,
	insertUser,
} from "@tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./get";

const router = t.router({ procedure });

const getItems = (
	items: Awaited<ReturnType<typeof insertReceiptItem>>[],
	parts: Awaited<ReturnType<typeof insertItemParticipant>>[],
) =>
	items
		.map((item) => ({
			id: item.id,
			name: item.name,
			locked: item.locked ?? false,
			price: Number(item.price),
			quantity: Number(item.quantity),
			created: item.created,
			parts: parts
				.filter((part) => part.itemId === item.id)
				.map((part) => ({ userId: part.userId, part: Number(part.part) }))
				.sort((a, b) => a.userId.localeCompare(b.userId)),
		}))
		.sort((a, b) => {
			const bCreated = b.created.valueOf();
			const aCreated = a.created.valueOf();
			if (aCreated === bCreated) {
				return a.id.localeCompare(b.id);
			}
			return bCreated - aCreated;
		});

const getParticipants = (
	participants: Awaited<ReturnType<typeof insertReceiptParticipant>>[],
) =>
	participants
		.map((participant) => ({
			userId: participant.userId,
			role: participant.role,
			resolved: participant.resolved,
			added: participant.added,
		}))
		.sort((a, b) => a.userId.localeCompare(b.userId));

describe("receiptItems.get", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router
				.createCaller(context)
				.procedure({ receiptId: faker.string.uuid() }),
		);

		describe("receiptId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ receiptId: "not-a-valid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "receiptId": Invalid uuid`,
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
				() => caller.procedure({ receiptId: fakeReceiptId }),
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
				() => caller.procedure({ receiptId: foreignReceiptId }),
				"FORBIDDEN",
				`Account "${email}" has no access to receipt "${foreignReceiptId}"`,
			);
		});
	});

	describe("functionality", () => {
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
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			const [selfParticipant, foreignParticipant, notConnectedParticipant] =
				await Promise.all([
					insertReceiptParticipant(ctx, receiptId, selfUserId),
					insertReceiptParticipant(ctx, receiptId, foreignUser.id),
					insertReceiptParticipant(ctx, receiptId, notConnectedUser.id),
				]);
			const receiptItems = await Promise.all([
				// item with multiple participants, with varied parts
				insertReceiptItem(ctx, receiptId),
				// item with 1 participant
				insertReceiptItem(ctx, receiptId),
				// item with no participants
				insertReceiptItem(ctx, receiptId),
			]);
			const parts = await Promise.all([
				insertItemParticipant(ctx, receiptItems[0].id, selfParticipant.userId, {
					part: 2,
				}),
				insertItemParticipant(
					ctx,
					receiptItems[0].id,
					foreignParticipant.userId,
				),
				insertItemParticipant(ctx, receiptItems[1].id, selfParticipant.userId),
				insertItemParticipant(
					ctx,
					receiptItems[2].id,
					notConnectedParticipant.userId,
				),
			]);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ receiptId });
			expect(result).toStrictEqual<typeof result>({
				items: getItems(receiptItems, parts),
				participants: getParticipants([
					selfParticipant,
					foreignParticipant,
					notConnectedParticipant,
				]),
			});
		});

		test("own receipt - no participants", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ receiptId });
			expect(result).toStrictEqual<typeof result>({
				items: [],
				participants: [],
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
			const [foreignToSelfUser] = await insertConnectedUsers(ctx, [
				foreignAccountId,
				accountId,
			]);
			await insertConnectedUsers(ctx, [accountId, connectedAccountId]);
			const [foreignConnectedUser] = await insertConnectedUsers(ctx, [
				foreignAccountId,
				connectedAccountId,
			]);
			const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
			const [
				selfParticipant,
				foreignParticipant,
				notConnectedParticipant,
				connectedParticipant,
			] = await Promise.all([
				insertReceiptParticipant(ctx, receiptId, foreignToSelfUser.id, {
					role: "viewer",
				}),
				insertReceiptParticipant(ctx, receiptId, foreignSelfUserId),
				insertReceiptParticipant(ctx, receiptId, notConnectedUser.id),
				insertReceiptParticipant(ctx, receiptId, foreignConnectedUser.id),
			]);
			const receiptItems = await Promise.all([
				// item with multiple participants, with varied parts
				insertReceiptItem(ctx, receiptId, {
					created: new Date(Date.now() - 20),
				}),
				// item with 1 participant
				insertReceiptItem(ctx, receiptId, {
					created: new Date(Date.now() - 10),
				}),
				// item with no participants
				insertReceiptItem(ctx, receiptId),
			]);
			const parts = await Promise.all([
				insertItemParticipant(ctx, receiptItems[0].id, selfParticipant.userId, {
					part: 2,
				}),
				insertItemParticipant(
					ctx,
					receiptItems[0].id,
					foreignParticipant.userId,
				),
				insertItemParticipant(
					ctx,
					receiptItems[0].id,
					connectedParticipant.userId,
				),
				insertItemParticipant(ctx, receiptItems[1].id, selfParticipant.userId),
				insertItemParticipant(
					ctx,
					receiptItems[2].id,
					notConnectedParticipant.userId,
				),
			]);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ receiptId });
			expect(result).toStrictEqual<typeof result>({
				items: getItems(receiptItems, parts),
				participants: getParticipants([
					selfParticipant,
					foreignParticipant,
					notConnectedParticipant,
					connectedParticipant,
				]),
			});
		});
	});
});
