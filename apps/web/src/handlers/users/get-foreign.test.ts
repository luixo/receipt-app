import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertReceipt,
	insertReceiptParticipant,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get-foreign";

const router = t.router({ procedure });

describe("users.getForeign", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({
				id: faker.string.uuid(),
			}),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							id: "not-a-valid-uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid uuid`,
				);
			});
		});

		test("user not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			// Verifying adding other users doesn't affect the error
			await insertUser(ctx, accountId);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const nonExistentUserId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						id: nonExistentUserId,
					}),
				"NOT_FOUND",
				`No user found by id "${nonExistentUserId}" or you don't have access to it.`,
			);
		});

		test("user is not owned by the account", async ({ ctx }) => {
			// Self account
			const { sessionId } = await insertAccountWithSession(ctx);
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, otherAccountId);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: foreignUserId,
					}),
				"NOT_FOUND",
				`No user found by id "${foreignUserId}" or you don't have access to it.`,
			);
		});

		test("user is our own user", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			// Verify other users do not interfere
			await insertUser(ctx, accountId);
			const { id: userId } = await insertUser(ctx, accountId);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: userId }),
				"NOT_FOUND",
				`No user found by id "${userId}" or you don't have access to it.`,
			);
		});
	});

	describe("functionality", () => {
		describe("user is not connected to a local user", () => {
			test("user has an account and public name", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const { id: otherAccountId } = await insertAccount(ctx);
				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));

				// Verify other users do not interfere
				const { id: otherUserId } = await insertUser(ctx, accountId);
				// Verify other receipt participants do not interfere
				await insertReceiptParticipant(ctx, receiptId, otherUserId);

				const [{ id: foreignUserId, name, publicName: foreignPublicName }] =
					await insertConnectedUsers(ctx, [
						{
							accountId: foreignAccountId,
							publicName: faker.person.fullName(),
						},
						otherAccountId,
					]);
				const [{ id: foreignSelfUserId }] = await insertConnectedUsers(ctx, [
					foreignAccountId,
					accountId,
				]);

				// Adding a foreign user into the receipt
				await insertReceiptParticipant(ctx, receiptId, foreignUserId);
				// Verify that we cannot access a user before we are added into the receipt
				await expectTRPCError(
					() => caller.procedure({ id: foreignUserId }),
					"NOT_FOUND",
					`No user found by id "${foreignUserId}" or you don't have access to it.`,
				);

				// Adding ourselves into the receipt
				await insertReceiptParticipant(ctx, receiptId, foreignSelfUserId);

				const result = await caller.procedure({
					id: foreignUserId,
				});
				expect(result).toStrictEqual<typeof result>({
					remoteId: foreignUserId,
					name: foreignPublicName || name,
				});
			});

			test("user has no account and public name", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);

				const [{ id: foreignSelfUserId }] = await insertConnectedUsers(ctx, [
					foreignAccountId,
					accountId,
				]);
				const { id: foreignUserId, name: foreignUserName } = await insertUser(
					ctx,
					foreignAccountId,
				);

				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfUserId);
				await insertReceiptParticipant(ctx, receiptId, foreignUserId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));

				const result = await caller.procedure({
					id: foreignUserId,
				});
				expect(result).toStrictEqual<typeof result>({
					remoteId: foreignUserId,
					name: foreignUserName,
				});
			});
		});

		describe("connected to a local user", () => {
			test("as a third-party account", async ({ ctx }) => {
				const {
					id: connectedAccountId,
					email: connectedEmail,
					avatarUrl: connectedAvatarUrl,
				} = await insertAccount(ctx);
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);

				const [{ id: localConnectedUserId, name, publicName }] =
					await insertConnectedUsers(ctx, [
						{ accountId, publicName: faker.person.fullName() },
						connectedAccountId,
					]);
				const [{ id: foreignUserId }] = await insertConnectedUsers(ctx, [
					foreignAccountId,
					connectedAccountId,
				]);
				const [{ id: foreignSelfUserId }] = await insertConnectedUsers(ctx, [
					foreignAccountId,
					accountId,
				]);

				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				await insertReceiptParticipant(ctx, receiptId, foreignUserId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfUserId);

				// Verify other users do not interfere
				const { id: otherUserId } = await insertUser(ctx, accountId);
				// Verify other receipt participants do not interfere
				await insertReceiptParticipant(ctx, receiptId, otherUserId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: foreignUserId });
				expect(result).toStrictEqual<typeof result>({
					id: localConnectedUserId,
					connectedAccount: {
						id: connectedAccountId,
						email: connectedEmail,
						avatarUrl: connectedAvatarUrl,
					},
					name,
					publicName,
				});
			});

			test("as a self account", async ({ ctx }) => {
				const { sessionId, accountId, userId, account, name } =
					await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);

				const [{ id: foreignSelfUserId }] = await insertConnectedUsers(ctx, [
					foreignAccountId,
					accountId,
				]);

				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfUserId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: foreignSelfUserId });
				expect(result).toStrictEqual<typeof result>({
					id: userId,
					connectedAccount: {
						id: accountId,
						email: account.email,
						avatarUrl: account.avatarUrl,
					},
					name,
					publicName: undefined,
				});
			});

			test("as a foreign account", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const {
					id: foreignAccountId,
					email: foreignEmail,
					userId: foreignAccountUserId,
				} = await insertAccount(ctx, { avatarUrl: null });

				const [
					{ id: foreignUserId, name, publicName },
					{ id: foreignSelfUserId },
				] = await insertConnectedUsers(ctx, [
					{ accountId, publicName: faker.person.fullName() },
					foreignAccountId,
				]);

				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				await insertReceiptParticipant(ctx, receiptId, foreignAccountUserId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfUserId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: foreignAccountUserId });
				expect(result).toStrictEqual<typeof result>({
					id: foreignUserId,
					connectedAccount: {
						id: foreignAccountId,
						email: foreignEmail,
						avatarUrl: undefined,
					},
					name,
					publicName,
				});
			});
		});
	});
});
