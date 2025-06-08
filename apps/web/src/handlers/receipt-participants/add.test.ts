import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
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
import { runSequentially } from "~web/handlers/debts/utils.test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./add";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receiptParticipants.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				receiptId: faker.string.uuid(),
				userId: faker.string.uuid(),
				role: "editor",
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
							role: "editor",
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
							role: "editor",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "userId": Invalid UUID`,
				);
			});
		});

		describe("role", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId: faker.string.uuid(),
							userId: faker.string.uuid(),
							role: "foo" as "editor",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "role": Invalid option: expected one of "viewer"|"editor"`,
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
			const fakeUserId = faker.string.uuid();

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						receiptId: foreignReceiptId,
						userId: fakeUserId,
						role: "editor",
					}),
				"FORBIDDEN",
				`Not enough rights to add participant "${fakeUserId}" to receipt "${foreignReceiptId}".`,
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
							role: "editor",
						}),
					"NOT_FOUND",
					`User "${fakeUserId}" does not exist or is not owned by you.`,
				);
			});

			test("is not owned by the account", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							userId: foreignUserId,
							role: "editor",
						}),
					"NOT_FOUND",
					`User "${foreignUserId}" does not exist or is not owned by you.`,
				);
			});

			test("is already added to the receipt", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertReceipt(ctx, accountId);

				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const { id: participantUserId } = await insertUser(ctx, accountId);
				await insertReceiptParticipant(ctx, receiptId, participantUserId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							userId: participantUserId,
							role: "editor",
						}),
					"CONFLICT",
					`User "${participantUserId}" already participates in receipt "${receiptId}".`,
				);
			});
		});
		describe("multiple participants", () => {
			test("duplicate tuples of user id and receipt id", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						runSequentially(
							[
								() =>
									caller.procedure({
										receiptId,
										userId: selfUserId,
										role: "editor",
									}),
								() =>
									caller.procedure({
										receiptId,
										userId: selfUserId,
										role: "viewer",
									}),
							],
							10,
						),
					"CONFLICT",
					`Expected to have unique pair of user id and receipt id, got repeating pairs: receipt "${receiptId}" / user "${selfUserId}" (2 times).`,
				);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const fakeUserId = faker.string.uuid();

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await expectDatabaseDiffSnapshot(ctx, () =>
					runSequentially(
						[
							() =>
								caller.procedure({
									receiptId,
									userId: selfUserId,
									role: "editor",
								}),
							() =>
								caller
									.procedure({
										receiptId,
										userId: fakeUserId,
										role: "editor",
									})
									.catch((e) => e),
						],
						10,
					),
				);

				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					createdAt: new Date(),
				});
				expect(results[1]).toBeInstanceOf(TRPCError);
			});
		});
	});

	describe("functionality", () => {
		test("participants are added", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			const { id: anotherReceiptId } = await insertReceipt(ctx, accountId);
			const user = await insertUser(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx, {
				avatarUrl: null,
			});
			const [foreignUser, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);

			// Verify unrelated data doesn't affect the result
			const { id: skippedReceiptId } = await insertReceipt(ctx, accountId);
			const { id: anotherUserId } = await insertUser(ctx, accountId);
			await insertReceiptParticipant(ctx, skippedReceiptId, anotherUserId);

			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfUserId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				runSequentially(
					[
						() =>
							caller.procedure({
								receiptId,
								userId: selfUserId,
								role: "editor",
							}),
						() =>
							caller.procedure({ receiptId, userId: user.id, role: "editor" }),
						() =>
							caller.procedure({
								receiptId,
								userId: foreignUser.id,
								role: "editor",
							}),
						() =>
							caller.procedure({
								receiptId: anotherReceiptId,
								userId: selfUserId,
								role: "viewer",
							}),
						() =>
							caller.procedure({
								receiptId: anotherReceiptId,
								userId: user.id,
								role: "viewer",
							}),
					],
					10,
				),
			);
			expect(result).toStrictEqual<typeof result>([
				{ createdAt: new Date() },
				{ createdAt: new Date() },
				{ createdAt: new Date() },
				{ createdAt: new Date() },
				{ createdAt: new Date() },
			]);
		});
	});
});
