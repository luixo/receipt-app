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
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./add";

const router = t.router({ procedure });

describe("receiptParticipants.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({
				receiptId: faker.string.uuid(),
				userIds: [faker.string.uuid()],
				role: "editor",
			}),
		);

		describe("receiptId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId: "not-a-uuid",
							userIds: [faker.string.uuid()],
							role: "editor",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "receiptId": Invalid uuid`,
				);
			});
		});

		describe("userIds", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId: faker.string.uuid(),
							userIds: ["not-a-uuid", faker.string.uuid()],
							role: "editor",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "userIds[0]": Invalid uuid`,
				);
			});
		});

		describe("role", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId: faker.string.uuid(),
							userIds: [faker.string.uuid()],
							role: "foo" as "editor",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "role": Invalid input`,
				);
			});
		});

		test("receipt does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await insertReceipt(ctx, accountId);
			const fakeReceiptId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						receiptId: fakeReceiptId,
						userIds: [faker.string.uuid()],
						role: "editor",
					}),
				"NOT_FOUND",
				`Receipt "${fakeReceiptId}" does not exist.`,
			);
		});

		test("receipt is not owned by an account", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			await insertReceipt(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						receiptId: foreignReceiptId,
						userIds: [faker.string.uuid()],
						role: "editor",
					}),
				"FORBIDDEN",
				`Not enough rights to add participant to receipt "${foreignReceiptId}".`,
			);
			await expectTRPCError(
				() =>
					caller.procedure({
						receiptId: foreignReceiptId,
						userIds: [faker.string.uuid(), faker.string.uuid()],
						role: "editor",
					}),
				"FORBIDDEN",
				`Not enough rights to add participants to receipt "${foreignReceiptId}".`,
			);
		});

		describe("one of the users", () => {
			test("does not exist", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const fakeUserId = faker.string.uuid();
				const anotherFakerUserId = faker.string.uuid();

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							userIds: [fakeUserId],
							role: "editor",
						}),
					"NOT_FOUND",
					`User "${fakeUserId}" does not exist.`,
				);
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							userIds: [fakeUserId, anotherFakerUserId],
							role: "editor",
						}),
					"NOT_FOUND",
					`Users "${fakeUserId}", "${anotherFakerUserId}" do not exist.`,
				);
			});

			test("is not owned by the account", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					account: { email },
				} = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
				const { id: anotherForeignUserId } = await insertUser(
					ctx,
					foreignAccountId,
				);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							userIds: [foreignUserId],
							role: "editor",
						}),
					"FORBIDDEN",
					`User "${foreignUserId}" is not owned by "${email}".`,
				);
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							userIds: [foreignUserId, anotherForeignUserId],
							role: "editor",
						}),
					"FORBIDDEN",
					`Users "${anotherForeignUserId}", "${foreignUserId}" are not owned by "${email}".`,
				);
			});

			test("is already added to the receipt", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertReceipt(ctx, accountId);

				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const { id: participantUserId } = await insertUser(ctx, accountId);
				await insertReceiptParticipant(ctx, receiptId, participantUserId);
				const { id: anotherParticipantUserId } = await insertUser(
					ctx,
					accountId,
				);
				await insertReceiptParticipant(
					ctx,
					receiptId,
					anotherParticipantUserId,
				);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							userIds: [participantUserId],
							role: "editor",
						}),
					"CONFLICT",
					`User "${participantUserId}" already participates in receipt "${receiptId}".`,
				);
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							userIds: [participantUserId, anotherParticipantUserId],
							role: "editor",
						}),
					"CONFLICT",
					`Users "${participantUserId}", "${anotherParticipantUserId}" already participate in receipt "${receiptId}".`,
				);
			});
		});
	});

	describe("functionality", () => {
		test("participants are added", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
				account: { email },
				name,
			} = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId, {
				// Verify that we can add participant in a locked receipt
				lockedTimestamp: new Date(),
			});
			const user = await insertUser(ctx, accountId);
			const { id: foreignAccountId, email: foreignEmail } = await insertAccount(
				ctx,
			);
			const [foreignUser, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);

			// Verify unrelated data doesn't affect the result
			const { id: anotherReceiptId } = await insertReceipt(ctx, accountId);
			const { id: anotherUserId } = await insertUser(ctx, accountId);
			await insertReceiptParticipant(ctx, anotherReceiptId, anotherUserId);

			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfUserId,
			);
			const users = [
				{
					email,
					name,
					publicName: null,
					accountId,
					id: selfUserId,
					added: new Date(),
					role: "owner" as const,
				},
				{
					email: null,
					name: user.name,
					publicName: user.publicName ?? null,
					accountId: null,
					id: user.id,
					added: new Date(),
					role: "editor" as const,
				},
				{
					email: foreignEmail,
					name: foreignUser.name,
					publicName: foreignUser.publicName ?? null,
					accountId: foreignAccountId,
					id: foreignUser.id,
					added: new Date(),
					role: "editor" as const,
				},
			];

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					receiptId,
					userIds: [selfUserId, user.id, foreignUser.id],
					role: "editor",
				}),
			);
			expect(result).toStrictEqual<typeof result>(users);
		});
	});
});
