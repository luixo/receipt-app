import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertReceipt,
	insertReceiptItem,
	insertReceiptItemConsumer,
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
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./add";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receiptItemConsumers.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				itemId: faker.string.uuid(),
				userId: faker.string.uuid(),
				part: 1,
			}),
		);

		describe("itemId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: "not-a-uuid",
							userId: faker.string.uuid(),
							part: 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "itemId": Invalid UUID`,
				);
			});
		});

		describe("userId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							userId: "not-a-uuid",
							part: 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "userId": Invalid UUID`,
				);
			});
		});

		describe("part", () => {
			test("negative", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							userId: faker.string.uuid(),
							part: -1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "part": Part should be greater than 0`,
				);
			});

			test("zero", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							userId: faker.string.uuid(),
							part: 0,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "part": Part should be non-zero`,
				);
			});

			test("fraction precision", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							userId: faker.string.uuid(),
							part: 1.000001,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "part": Part should have at maximum 5 decimals`,
				);
			});

			test("too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: faker.string.uuid(),
							userId: faker.string.uuid(),
							part: 10 ** 9 + 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "part": Part should be less than 1 million`,
				);
			});
		});

		test("receipt item does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptItem(ctx, receiptId);
			const fakeReceiptItemId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: fakeReceiptItemId,
						userId: faker.string.uuid(),
						part: 1,
					}),
				"NOT_FOUND",
				`Receipt item "${fakeReceiptItemId}" does not exist.`,
			);
		});

		test("not enough rights to add an item participant", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			await insertReceipt(ctx, accountId);

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
				{ role: "viewer" },
			);
			const { id: receiptItemId } = await insertReceiptItem(
				ctx,
				foreignReceiptId,
			);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						itemId: receiptItemId,
						userId: foreignToSelfUserId,
						part: 1,
					}),
				"FORBIDDEN",
				`Not enough rights to add item to receipt "${foreignReceiptId}".`,
			);
		});

		describe("user", () => {
			test("does not exist", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
				const fakeUserId = faker.string.uuid();

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: receiptItemId,
							userId: fakeUserId,
							part: 1,
						}),
					"PRECONDITION_FAILED",
					`User "${fakeUserId}" doesn't participate in receipt "${receiptId}".`,
				);
			});

			test("does not participate in the receipt", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
				const { id: userId } = await insertUser(ctx, foreignAccountId);

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: receiptItemId,
							userId,
							part: 1,
						}),
					"PRECONDITION_FAILED",
					`User "${userId}" doesn't participate in receipt "${receiptId}".`,
				);
			});

			test("is already added to the item", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertReceipt(ctx, accountId);

				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);

				const { id: participantUserId } = await insertUser(ctx, accountId);
				await insertReceiptParticipant(ctx, receiptId, participantUserId);
				await insertReceiptItemConsumer(ctx, receiptItemId, participantUserId);
				const { id: anotherParticipantUserId } = await insertUser(
					ctx,
					accountId,
				);
				await insertReceiptParticipant(
					ctx,
					receiptId,
					anotherParticipantUserId,
				);
				await insertReceiptItemConsumer(
					ctx,
					receiptItemId,
					anotherParticipantUserId,
				);

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							itemId: receiptItemId,
							userId: participantUserId,
							part: 1,
						}),
					"CONFLICT",
					`User "${participantUserId}" already consumes item "${receiptItemId}".`,
				);
			});
		});

		describe("multiple participants", () => {
			test("duplicate tuples of user id and item id", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
				const user = await insertUser(ctx, accountId);
				await insertReceiptParticipant(ctx, receiptId, user.id);

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						runInBand([
							() =>
								caller.procedure({
									itemId: receiptItemId,
									userId: user.id,
									part: 1,
								}),
							() =>
								caller.procedure({
									itemId: receiptItemId,
									userId: user.id,
									part: 2,
								}),
						]),
					"CONFLICT",
					`Expected to have unique pair of item id and user id, got repeating pairs: item "${receiptItemId}" / user "${user.id}" (2 times).`,
				);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);

				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
				const user = await insertUser(ctx, accountId);
				await insertReceiptParticipant(ctx, receiptId, user.id);

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const results = await expectDatabaseDiffSnapshot(ctx, () =>
					runInBand([
						() =>
							caller.procedure({
								itemId: receiptItemId,
								userId: user.id,
								part: 1,
							}),
						() =>
							caller
								.procedure({
									itemId: receiptItemId,
									userId: "not a valid uuid",
									part: 1,
								})
								.catch((e) => e),
					]),
				);

				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					createdAt: new Date(),
				});
				expect(results[1]).toBeInstanceOf(TRPCError);
			});
		});
	});

	describe("functionality", () => {
		test("multiple participants are added to multiple items in multiple receipts", async ({
			ctx,
		}) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
			const { id: anotherReceiptItemId } = await insertReceiptItem(
				ctx,
				receiptId,
			);
			const user = await insertUser(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [foreignUser, foreignToSelfUser] = await insertConnectedUsers(ctx, [
				accountId,
				foreignAccountId,
			]);

			await insertReceiptParticipant(ctx, receiptId, selfUserId);
			await insertReceiptParticipant(ctx, receiptId, user.id);
			await insertReceiptParticipant(ctx, receiptId, foreignUser.id);

			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfUser.id,
				{ role: "editor" },
			);
			const { id: foreignReceiptItemId } = await insertReceiptItem(
				ctx,
				foreignReceiptId,
			);

			// Verify unrelated data doesn't affect the result
			const { id: anotherReceiptId } = await insertReceipt(ctx, accountId);
			const { id: anotherUserId } = await insertUser(ctx, accountId);
			await insertReceiptParticipant(ctx, anotherReceiptId, anotherUserId);
			await insertReceiptItem(ctx, anotherReceiptId);
			const { id: anotherForeignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptParticipant(
				ctx,
				anotherForeignReceiptId,
				foreignToSelfUser.id,
			);
			await insertReceiptItem(ctx, anotherForeignReceiptId);
			await insertReceiptItemConsumer(ctx, anotherReceiptItemId, user.id);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const results = await expectDatabaseDiffSnapshot(ctx, () =>
				runInBand([
					() =>
						caller.procedure({
							itemId: receiptItemId,
							userId: selfUserId,
							part: 1,
						}),
					() =>
						caller.procedure({
							itemId: receiptItemId,
							userId: user.id,
							part: 0.1,
						}),
					() =>
						caller.procedure({
							itemId: receiptItemId,
							userId: foreignUser.id,
							part: 3,
						}),
					() =>
						caller.procedure({
							itemId: anotherReceiptItemId,
							userId: selfUserId,
							part: 1,
						}),
					() =>
						caller.procedure({
							itemId: anotherReceiptItemId,
							userId: foreignUser.id,
							part: 2,
						}),
					() =>
						caller.procedure({
							itemId: foreignReceiptItemId,
							userId: foreignToSelfUser.id,
							part: 1,
						}),
				]),
			);
			expect(results).toStrictEqual<typeof results>([
				{ createdAt: new Date() },
				{ createdAt: new Date() },
				{ createdAt: new Date() },
				{ createdAt: new Date() },
				{ createdAt: new Date() },
				{ createdAt: new Date() },
			]);
		});
	});
});
