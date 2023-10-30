import { faker } from "@faker-js/faker";
import { describe } from "vitest";

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

import { procedure } from "./update";

const router = t.router({ procedure });

describe("receiptParticipants.update", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({
				receiptId: faker.string.uuid(),
				userId: faker.string.uuid(),
				update: { type: "role", role: "viewer" },
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
							userId: faker.string.uuid(),
							update: { type: "role", role: "viewer" },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "receiptId": Invalid uuid`,
				);
			});
		});

		describe("userId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId: faker.string.uuid(),
							userId: "not-a-uuid",
							update: { type: "role", role: "viewer" },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "userId": Invalid uuid`,
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
						userId: faker.string.uuid(),
						update: { type: "role", role: "viewer" },
					}),
				"NOT_FOUND",
				`Receipt "${fakeReceiptId}" does not exist.`,
			);
		});

		describe("user", () => {
			test("does not exist", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const fakeUserId = faker.string.uuid();

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							userId: fakeUserId,
							update: { type: "role", role: "viewer" },
						}),
					"NOT_FOUND",
					`User "${fakeUserId}" does not exist.`,
				);
			});

			test("is not participating in the receipt", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertReceipt(ctx, accountId);

				const { id: notParticipantUserId } = await insertUser(ctx, accountId);
				const { id: receiptId } = await insertReceipt(ctx, accountId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							userId: notParticipantUserId,
							update: { type: "role", role: "viewer" },
						}),
					"CONFLICT",
					`User "${notParticipantUserId}" does not participate in receipt "${receiptId}".`,
				);
			});
		});

		describe("role", () => {
			test("cannot be updated for yourself as an owner", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				await insertReceiptParticipant(ctx, receiptId, selfUserId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							userId: selfUserId,
							update: { type: "role", role: "viewer" },
						}),
					"BAD_REQUEST",
					`Cannot modify your own receipt role.`,
				);
			});

			test("cannot be updated for anyone if you are not a receipt owner", async ({
				ctx,
			}) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const { id: foreignReceiptId } = await insertReceipt(
					ctx,
					foreignAccountId,
				);
				const [{ id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
					foreignAccountId,
					accountId,
				]);
				await insertReceiptParticipant(
					ctx,
					foreignReceiptId,
					foreignToSelfUserId,
					{ role: "editor" },
				);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId: foreignReceiptId,
							userId: foreignToSelfUserId,
							update: { type: "role", role: "viewer" },
						}),
					"FORBIDDEN",
					`Only receipt owner can modify user receipt role.`,
				);
			});
		});

		describe("resolved", () => {
			test("cannot be updated for anyone but yourself", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				await insertReceiptParticipant(ctx, receiptId, selfUserId);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: foreignUserId }] = await insertConnectedUsers(ctx, [
					accountId,
					foreignAccountId,
				]);
				await insertReceiptParticipant(ctx, receiptId, foreignUserId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							userId: foreignUserId,
							update: { type: "resolved", resolved: true },
						}),
					"FORBIDDEN",
					`You can modify only your own "resolved" status.`,
				);
			});
		});
	});

	describe("functionality", () => {
		describe("update role", () => {
			test("for another user", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const [{ id: foreignUserId }] = await insertConnectedUsers(ctx, [
					accountId,
					foreignAccountId,
				]);
				await insertReceiptParticipant(ctx, receiptId, foreignUserId, {
					role: "editor",
					resolved: true,
				});

				// Verify unrelated data doesn't affect the result
				await insertReceiptParticipant(ctx, receiptId, selfUserId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({
						receiptId,
						userId: foreignUserId,
						update: { type: "role", role: "viewer" },
					}),
				);
			});
		});

		describe("update resolved", () => {
			test("in an own receipt", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const [{ id: foreignUserId }] = await insertConnectedUsers(ctx, [
					accountId,
					foreignAccountId,
				]);
				await insertReceiptParticipant(ctx, receiptId, selfUserId, {
					resolved: true,
				});
				await insertReceiptParticipant(ctx, receiptId, foreignUserId, {
					resolved: true,
				});

				// Verify unrelated data doesn't affect the result
				await insertReceiptParticipant(ctx, receiptId, selfUserId);

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({
						receiptId,
						userId: selfUserId,
						update: { type: "resolved", resolved: false },
					}),
				);
			});

			test("in a foreign receipt", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId, userId: foreignSelfUserId } =
					await insertAccount(ctx);
				const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				const [{ id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
					foreignAccountId,
					accountId,
				]);
				await insertReceiptParticipant(ctx, receiptId, foreignToSelfUserId, {
					resolved: true,
				});
				await insertReceiptParticipant(ctx, receiptId, foreignSelfUserId, {
					resolved: true,
				});

				// Verify unrelated data doesn't affect the result
				await insertReceiptParticipant(ctx, receiptId, foreignUserId, {
					resolved: true,
				});

				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({
						receiptId,
						userId: foreignToSelfUserId,
						update: { type: "resolved", resolved: false },
					}),
				);
			});
		});
	});
});
