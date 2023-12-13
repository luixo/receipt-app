import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertReceipt,
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

describe("users.get", () => {
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
				`No user found by id "${nonExistentUserId}".`,
			);
		});

		test("user is not owned by the account", async ({ ctx }) => {
			// Self account
			const {
				sessionId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, otherAccountId);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: foreignUserId,
					}),
				"FORBIDDEN",
				`User "${foreignUserId}" is not owned by "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		describe("own user", () => {
			test("with public name and email", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId, email: foreignEmail } =
					await insertAccount(ctx);
				// Verify other users do not interfere
				await insertUser(ctx, accountId);
				const [{ id: userId, name, publicName }] = await insertConnectedUsers(
					ctx,
					[
						{ accountId, publicName: faker.person.fullName() },
						foreignAccountId,
					],
				);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: userId });
				expect(result).toStrictEqual<typeof result>({
					account: {
						id: foreignAccountId,
						email: foreignEmail,
						avatarUrl: undefined,
					},
					localId: userId,
					name,
					publicName,
					remoteId: userId,
				});
			});

			test("without public name and email", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				// Verify other users do not interfere
				await insertUser(ctx, accountId);
				const { id: userId, name } = await insertUser(ctx, accountId);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: userId });
				expect(result).toStrictEqual<typeof result>({
					account: undefined,
					localId: userId,
					name,
					publicName: undefined,
					remoteId: userId,
				});
			});
		});

		describe("foreign user is fetched via connected receipt", () => {
			describe("not connected to a local user", () => {
				test("with public name and email", async ({ ctx }) => {
					const { sessionId, accountId, account } =
						await insertAccountWithSession(ctx);
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
						"FORBIDDEN",
						`User "${foreignUserId}" is not owned by "${account.email}".`,
					);

					// Adding ourselves into the receipt
					await insertReceiptParticipant(ctx, receiptId, foreignSelfUserId);

					const result = await caller.procedure({ id: foreignUserId });
					expect(result).toStrictEqual<typeof result>({
						account: undefined,
						localId: null,
						name: foreignPublicName || name,
						publicName: foreignPublicName,
						remoteId: foreignUserId,
					});
				});

				test("no public name and email", async ({ ctx }) => {
					const { sessionId, accountId, account } =
						await insertAccountWithSession(ctx);
					const { id: foreignAccountId } = await insertAccount(ctx);
					const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
					const caller = router.createCaller(createAuthContext(ctx, sessionId));

					// Verify other users do not interfere
					const { id: otherUserId } = await insertUser(ctx, accountId);
					// Verify other receipt participants do not interfere
					await insertReceiptParticipant(ctx, receiptId, otherUserId);

					const { id: foreignUserId, name } = await insertUser(
						ctx,
						foreignAccountId,
					);
					const [{ id: foreignSelfUserId }] = await insertConnectedUsers(ctx, [
						foreignAccountId,
						accountId,
					]);

					// Adding a foreign user into the receipt
					await insertReceiptParticipant(ctx, receiptId, foreignUserId);
					// Verify that we cannot access a user before we are added into the receipt
					await expectTRPCError(
						() => caller.procedure({ id: foreignUserId }),
						"FORBIDDEN",
						`User "${foreignUserId}" is not owned by "${account.email}".`,
					);

					// Adding ourselves into the receipt
					await insertReceiptParticipant(ctx, receiptId, foreignSelfUserId);

					const result = await caller.procedure({ id: foreignUserId });
					expect(result).toStrictEqual<typeof result>({
						account: undefined,
						localId: null,
						name,
						publicName: undefined,
						remoteId: foreignUserId,
					});
				});
			});

			describe("connected to a local user", () => {
				test("as a third-party account", async ({ ctx }) => {
					const { id: connectedAccountId, email: connectedEmail } =
						await insertAccount(ctx);
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
						account: {
							id: connectedAccountId,
							email: connectedEmail,
							avatarUrl: undefined,
						},
						localId: localConnectedUserId,
						name,
						publicName,
						remoteId: foreignUserId,
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
						account: {
							id: accountId,
							email: account.email,
							avatarUrl: undefined,
						},
						localId: userId,
						name,
						publicName: undefined,
						remoteId: foreignSelfUserId,
					});
				});

				test("as a foreign account", async ({ ctx }) => {
					const { sessionId, accountId } = await insertAccountWithSession(ctx);
					const {
						id: foreignAccountId,
						email: foreignEmail,
						userId: foreignAccountUserId,
					} = await insertAccount(ctx);

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
						account: {
							id: foreignAccountId,
							email: foreignEmail,
							avatarUrl: undefined,
						},
						localId: foreignUserId,
						name,
						publicName,
						remoteId: foreignAccountUserId,
					});
				});
			});
		});
	});
});
