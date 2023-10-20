import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertReceipt,
	insertReceiptParticipant,
	insertSelfUser,
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
		test("user is fetched", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			// Verify other users do not interfere
			await insertUser(ctx, accountId);
			const { id: userId, name } = await insertUser(ctx, accountId);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ id: userId });
			expect(result).toStrictEqual<typeof result>({
				accountId: null,
				email: undefined,
				localId: userId,
				name,
				publicName: undefined,
				remoteId: userId,
			});
		});

		describe("foreign user is fetched via connected receipt", () => {
			test("not connected to a local user", async ({ ctx }) => {
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
				const { id: foreignSelfUserId } = await insertUser(
					ctx,
					foreignAccountId,
					{ connectedAccountId: accountId },
				);

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
					accountId: null,
					email: undefined,
					localId: null,
					name,
					publicName: undefined,
					remoteId: foreignUserId,
				});
			});

			describe("connected to a local user", () => {
				test("as a third-party account", async ({ ctx }) => {
					const { id: connectedAccountId, email: connectedEmail } =
						await insertAccount(ctx);
					const { sessionId, accountId } = await insertAccountWithSession(ctx);
					const { id: foreignAccountId } = await insertAccount(ctx);

					const {
						id: localConnectedUserId,
						name,
						publicName,
					} = await insertUser(ctx, accountId, {
						connectedAccountId,
						publicName: faker.person.fullName(),
					});
					const { id: foreignUserId } = await insertUser(
						ctx,
						foreignAccountId,
						{ connectedAccountId },
					);
					const { id: foreignSelfUserId } = await insertUser(
						ctx,
						foreignAccountId,
						{ connectedAccountId: accountId },
					);

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
						accountId: connectedAccountId,
						email: connectedEmail,
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

					const { id: foreignSelfUserId } = await insertUser(
						ctx,
						foreignAccountId,
						{
							connectedAccountId: accountId,
						},
					);

					const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
					await insertReceiptParticipant(ctx, receiptId, foreignSelfUserId);

					const caller = router.createCaller(createAuthContext(ctx, sessionId));
					const result = await caller.procedure({ id: foreignSelfUserId });
					expect(result).toStrictEqual<typeof result>({
						accountId,
						email: account.email,
						localId: userId,
						name,
						publicName: undefined,
						remoteId: foreignSelfUserId,
					});
				});

				test("as a foreign account", async ({ ctx }) => {
					const { sessionId, accountId } = await insertAccountWithSession(ctx);
					const { id: foreignAccountId, email } = await insertAccount(ctx);
					const { id: foreignAccountUserId } = await insertSelfUser(
						ctx,
						foreignAccountId,
					);

					const {
						id: foreignUserId,
						name,
						publicName,
					} = await insertUser(ctx, accountId, {
						connectedAccountId: foreignAccountId,
						publicName: faker.person.fullName(),
					});
					const { id: foreignSelfUserId } = await insertUser(
						ctx,
						foreignAccountId,
						{ connectedAccountId: accountId },
					);

					const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
					await insertReceiptParticipant(ctx, receiptId, foreignAccountUserId);
					await insertReceiptParticipant(ctx, receiptId, foreignSelfUserId);

					const caller = router.createCaller(createAuthContext(ctx, sessionId));
					const result = await caller.procedure({ id: foreignAccountUserId });
					expect(result).toStrictEqual<typeof result>({
						accountId: foreignAccountId,
						email,
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
