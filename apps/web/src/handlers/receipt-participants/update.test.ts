import { faker } from "@faker-js/faker";
import { describe } from "vitest";

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

import { procedure } from "./update";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receiptParticipants.update", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				receiptId: faker.string.uuid(),
				userId: faker.string.uuid(),
				update: { type: "role", role: "viewer" },
			}),
		);

		describe("receiptId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId: "not-a-uuid",
							userId: faker.string.uuid(),
							update: { type: "role", role: "viewer" },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "receiptId": Invalid UUID`,
				);
			});
		});

		describe("userId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId: faker.string.uuid(),
							userId: "not-a-uuid",
							update: { type: "role", role: "viewer" },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "userId": Invalid UUID`,
				);
			});
		});

		test("receipt does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
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

				const caller = createCaller(createAuthContext(ctx, sessionId));
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

				const caller = createCaller(createAuthContext(ctx, sessionId));
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

				const caller = createCaller(createAuthContext(ctx, sessionId));
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

				const caller = createCaller(createAuthContext(ctx, sessionId));
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
				});

				// Verify unrelated data doesn't affect the result
				await insertReceiptParticipant(ctx, receiptId, selfUserId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({
						receiptId,
						userId: foreignUserId,
						update: { type: "role", role: "viewer" },
					}),
				);
			});
		});
	});
});
