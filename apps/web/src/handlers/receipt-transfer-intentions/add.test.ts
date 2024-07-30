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
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./add";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receiptTransferIntentions.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				targetEmail: faker.internet.email(),
				receiptId: faker.string.uuid(),
			}),
		);

		describe("receiptId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							targetEmail: faker.internet.email(),
							receiptId: "invalid-uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "receiptId": Invalid uuid`,
				);
			});
		});

		describe("targetEmail", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							targetEmail: "invalid-email",
							receiptId: faker.string.uuid(),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "targetEmail": Invalid email address`,
				);
			});
		});

		test("targeting yourself", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const { id: receiptId } = await insertReceipt(ctx, accountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						targetEmail: email,
						receiptId,
					}),
				"BAD_REQUEST",
				`Cannot transfer receipt to yourself`,
			);
		});

		describe("target account", () => {
			test("does not exist", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const fakeEmail = faker.internet.email();

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							targetEmail: fakeEmail,
							receiptId,
						}),
					"BAD_REQUEST",
					`Account "${fakeEmail}" does not exist or you don't have a user connected to it.`,
				);
			});

			test("is not connected with your account", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const { email } = await insertAccount(ctx);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							targetEmail: email,
							receiptId,
						}),
					"BAD_REQUEST",
					`Account "${email}" does not exist or you don't have a user connected to it.`,
				);
			});
		});

		test("receipt does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId, email: foreignEmail } = await insertAccount(
				ctx,
			);
			await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const fakeReceiptId = faker.string.uuid();

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						targetEmail: foreignEmail,
						receiptId: fakeReceiptId,
					}),
				"NOT_FOUND",
				`Receipt "${fakeReceiptId}" does not exist or you are not its owner.`,
			);
		});

		test("receipt is not owned by an account", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId, email: foreignEmail } = await insertAccount(
				ctx,
			);
			const [, { id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
				accountId,
				foreignAccountId,
			]);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			// Being added to the receipt doesn't allow you to create transfer intentions
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfUserId,
			);
			// Own receipts don't interfere with this error
			await insertReceipt(ctx, accountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						targetEmail: foreignEmail,
						receiptId: foreignReceiptId,
					}),
				"NOT_FOUND",
				`Receipt "${foreignReceiptId}" does not exist or you are not its owner.`,
			);
		});

		describe("receipt has users", () => {
			test("with connected account", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId, email: foreignEmail } =
					await insertAccount(ctx);
				const [{ id: foreignUserId, name: foreignUserName }] =
					await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				await insertReceiptParticipant(ctx, receiptId, foreignUserId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							targetEmail: foreignEmail,
							receiptId,
						}),
					"BAD_REQUEST",
					`Cannot send receipt transfer intention while having user "${foreignUserName}" added to it.`,
				);
			});

			test("without connected account", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId, email: foreignEmail } =
					await insertAccount(ctx);
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
				const { id: userId, name: userName } = await insertUser(ctx, accountId);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				await insertReceiptParticipant(ctx, receiptId, userId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							targetEmail: foreignEmail,
							receiptId,
						}),
					"BAD_REQUEST",
					`Cannot send receipt transfer intention while having user "${userName}" added to it.`,
				);
			});
		});

		test("receipt is locked", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId, email: foreignEmail } = await insertAccount(
				ctx,
			);
			await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const { id: receiptId } = await insertReceipt(ctx, accountId, {
				lockedTimestamp: new Date(),
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						targetEmail: foreignEmail,
						receiptId,
					}),
				"BAD_REQUEST",
				`Cannot send receipt transfer intention while receipt is locked.`,
			);
		});

		test("receipt already has a transfer intention", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId, email: foreignEmail } = await insertAccount(
				ctx,
			);
			const [{ name: foreignUserName }] = await insertConnectedUsers(ctx, [
				accountId,
				foreignAccountId,
			]);
			const { id: receiptId } = await insertReceipt(ctx, accountId, {
				transferIntentionAccountId: foreignAccountId,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						targetEmail: foreignEmail,
						receiptId,
					}),
				"BAD_REQUEST",
				`There is already a transfer intention to user "${foreignUserName}".`,
			);
		});
	});

	describe("functionality", () => {
		test("transfer intention is added", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId, email: foreignEmail } = await insertAccount(
				ctx,
			);
			await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			const { id: receiptId } = await insertReceipt(ctx, accountId);

			// Verify unrelated data doesn't affect the result
			const { id: anotherReceiptId } = await insertReceipt(ctx, accountId);
			const { id: anotherUserId } = await insertUser(ctx, accountId);
			await insertReceiptParticipant(ctx, anotherReceiptId, anotherUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					targetEmail: foreignEmail,
					receiptId,
				}),
			);
			expect(result).toBeUndefined();
		});
	});
});
