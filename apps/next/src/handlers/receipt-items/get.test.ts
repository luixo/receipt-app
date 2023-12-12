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
import type { AccountsId } from "next-app/db/models";
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
			parts: parts
				.filter((part) => part.itemId === item.id)
				.map((part) => ({ userId: part.userId, part: Number(part.part) }))
				.sort((a, b) => a.userId.localeCompare(b.userId)),
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

type ParticipantUser = Omit<
	Awaited<ReturnType<typeof insertUser>>,
	"connectedAccountId"
> & { connectedAccountId?: AccountsId };

type ParticipantAccount = {
	id: AccountsId;
	email: string;
	avatarUrl: undefined;
};

const getParticipants = (
	participants: Awaited<ReturnType<typeof insertReceiptParticipant>>[],
	users: [ParticipantUser, ParticipantUser?][],
	accounts: ParticipantAccount[],
) =>
	participants
		.map((participant) => {
			const matchedUsers = users.find(
				([foreignUser]) => foreignUser.id === participant.userId,
			);
			if (!matchedUsers) {
				throw new Error(
					`Expected to find a matched user for participant ${participant.userId}`,
				);
			}
			const [foreignMatchedUser, selfMatchedUser] = matchedUsers;
			const matchedAccount = accounts.find(
				(account) => account.id === foreignMatchedUser.connectedAccountId,
			);
			return {
				remoteUserId: participant.userId,
				name: selfMatchedUser
					? selfMatchedUser.name
					: foreignMatchedUser.publicName || foreignMatchedUser.name,
				publicName: selfMatchedUser?.publicName ?? null,
				account:
					foreignMatchedUser.connectedAccountId && matchedAccount?.email
						? {
								id: foreignMatchedUser.connectedAccountId,
								email: matchedAccount.email,
								avatarUrl: undefined,
						  }
						: undefined,
				role: participant.role,
				resolved: participant.resolved,
				added: participant.added,
			};
		})
		.sort((a, b) => a.remoteUserId.localeCompare(b.remoteUserId));

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
				name,
				account: { email },
			} = await insertAccountWithSession(ctx);
			const notConnectedUser = await insertUser(ctx, accountId);
			const { id: foreignAccountId, email: foreignEmail } = await insertAccount(
				ctx,
			);
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
				role: "owner",
				items: getItems(receiptItems, parts),
				participants: getParticipants(
					[selfParticipant, foreignParticipant, notConnectedParticipant],
					[
						{
							id: selfUserId,
							name,
							publicName: undefined,
							connectedAccountId: accountId,
						},
						{ ...foreignUser },
						{ ...notConnectedUser, connectedAccountId: undefined },
					].map((user) => [user, user]),
					[
						{ id: accountId, email, avatarUrl: undefined },
						{ id: foreignAccountId, email: foreignEmail, avatarUrl: undefined },
					],
				),
			});
		});

		test("own receipt - no participants", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ receiptId });
			expect(result).toStrictEqual<typeof result>({
				role: "owner",
				items: [],
				participants: [],
			});
		});

		test("foreign receipt", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
				name,
				account: { email },
			} = await insertAccountWithSession(ctx);
			const { id: connectedAccountId, email: connectedEmail } =
				await insertAccount(ctx);
			const {
				id: foreignAccountId,
				email: foreignEmail,
				userId: foreignSelfUserId,
				name: foreignName,
			} = await insertAccount(ctx);
			const notConnectedUser = await insertUser(ctx, foreignAccountId);
			const [foreignUser, foreignToSelfUser] = await insertConnectedUsers(ctx, [
				accountId,
				foreignAccountId,
			]);
			const [connectedUser] = await insertConnectedUsers(ctx, [
				accountId,
				connectedAccountId,
			]);
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
				role: "viewer",
				items: getItems(receiptItems, parts),
				participants: getParticipants(
					[
						selfParticipant,
						foreignParticipant,
						notConnectedParticipant,
						connectedParticipant,
					],
					[
						[
							foreignToSelfUser,
							{
								id: selfUserId,
								name,
								publicName: undefined,
								connectedAccountId: accountId,
							},
						],
						[
							{
								id: foreignSelfUserId,
								name: foreignName,
								publicName: undefined,
								connectedAccountId: foreignAccountId,
							},
							foreignUser,
						],
						[{ ...notConnectedUser, connectedAccountId: undefined }],
						[foreignConnectedUser, connectedUser],
					],
					[
						{ id: accountId, email, avatarUrl: undefined },
						{ id: foreignAccountId, email: foreignEmail, avatarUrl: undefined },
						{
							id: connectedAccountId,
							email: connectedEmail,
							avatarUrl: undefined,
						},
					],
				),
			});
		});
	});
});
