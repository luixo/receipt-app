import { faker } from "@faker-js/faker";
import { describe } from "vitest";

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
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import type { TestContext } from "@tests/backend/utils/test";
import { test } from "@tests/backend/utils/test";
import type { TRPCMutationInput } from "app/trpc";
import { t } from "next-app/handlers/trpc";

import {
	verifyName,
	verifyPrice,
	verifyQuantity,
	verifyReceiptItemId,
} from "./test.utils";
import { procedure } from "./update";

const router = t.router({ procedure });

const runTests = (
	getUpdate: () => TRPCMutationInput<"receiptItems.update">["update"],
	lockedBefore = false,
) => {
	const runTest = async (ctx: TestContext, type: "own" | "foreign") => {
		const { sessionId, accountId } = await insertAccountWithSession(ctx);
		const { id: receiptId } = await insertReceipt(
			ctx,
			accountId,
			lockedBefore ? { lockedTimestamp: new Date("2020-06-01") } : undefined,
		);
		const { id: userId } = await insertUser(ctx, accountId);
		const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
		await insertReceiptParticipant(ctx, receiptId, userId);
		await insertItemParticipant(ctx, receiptItemId, userId);

		// Verify unrelated data doesn't affect the result
		const { id: anotherUserId } = await insertUser(ctx, accountId);
		const { id: anotherReceiptId } = await insertReceipt(ctx, accountId);
		await insertReceiptParticipant(ctx, anotherReceiptId, anotherUserId);
		await insertReceiptItem(ctx, anotherReceiptId);

		const { id: foreignAccountId } = await insertAccount(ctx);
		const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
		const { id: foreignReceiptId } = await insertReceipt(ctx, foreignAccountId);
		const [{ id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
			foreignAccountId,
			accountId,
		]);
		await insertReceiptParticipant(ctx, foreignReceiptId, foreignUserId);
		await insertReceiptParticipant(ctx, foreignReceiptId, foreignToSelfUserId, {
			role: "editor",
		});
		const { id: foreignReceiptItemId } = await insertReceiptItem(
			ctx,
			foreignReceiptId,
		);

		const caller = router.createCaller(createAuthContext(ctx, sessionId));
		await expectDatabaseDiffSnapshot(ctx, () =>
			caller.procedure({
				id: type === "own" ? receiptItemId : foreignReceiptItemId,
				update: getUpdate(),
			}),
		);
	};
	test("own", async ({ ctx }) => {
		await runTest(ctx, "own");
	});
	test("foreign", async ({ ctx }) => {
		await runTest(ctx, "foreign");
	});
};

describe("receiptItems.update", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({
				id: faker.string.uuid(),
				update: { type: "name", name: faker.lorem.words() },
			}),
		);

		verifyReceiptItemId(
			(context, receiptId) =>
				router.createCaller(context).procedure({
					id: receiptId,
					update: { type: "name", name: faker.lorem.words() },
				}),
			"",
		);

		verifyName(
			(context, name) =>
				router.createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { type: "name", name },
				}),
			"update.",
		);

		verifyPrice(
			(context, price) =>
				router.createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { type: "price", price },
				}),
			"update.",
		);

		verifyQuantity(
			(context, quantity) =>
				router.createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { type: "quantity", quantity },
				}),
			"update.",
		);

		test("receipt item does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptItem(ctx, receiptId);
			const fakeReceiptItemId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						id: fakeReceiptItemId,
						update: { type: "name", name: faker.lorem.words() },
					}),
				"NOT_FOUND",
				`Receipt item "${fakeReceiptItemId}" is not found.`,
			);
		});

		test("receipt is not owned by an account", async ({ ctx }) => {
			const { sessionId, accountId, account } = await insertAccountWithSession(
				ctx,
			);
			await insertReceipt(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			const { id: foreignReceiptItemId } = await insertReceiptItem(
				ctx,
				foreignReceiptId,
			);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: foreignReceiptItemId,
						update: { type: "name", name: faker.lorem.words() },
					}),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not allowed to be modified by "${account.email}".`,
			);
		});

		test("receipt role is lower than editor", async ({ ctx }) => {
			const { sessionId, accountId, account } = await insertAccountWithSession(
				ctx,
			);
			await insertReceipt(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
				foreignAccountId,
				accountId,
			]);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfUserId,
				{ role: "viewer" },
			);
			const { id: foreignReceiptItemId } = await insertReceiptItem(
				ctx,
				foreignReceiptId,
			);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: foreignReceiptItemId,
						update: { type: "name", name: faker.lorem.words() },
					}),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not allowed to be modified by "${account.email}" with role "viewer"`,
			);
		});

		test("receipt is locked", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId, {
				lockedTimestamp: new Date(),
			});
			const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: receiptItemId,
						update: { type: "name", name: faker.lorem.words() },
					}),
				"FORBIDDEN",
				`Receipt "${receiptId}" cannot be updated while locked.`,
			);
		});
	});

	describe("functionality", () => {
		describe("update name", () => {
			runTests(() => ({ type: "name", name: faker.lorem.words() }));
		});

		describe("update price", () => {
			runTests(() => ({
				type: "price",
				price: Number(faker.finance.amount()),
			}));
		});

		describe("update quantity", () => {
			runTests(() => ({
				type: "quantity",
				quantity: faker.number.int({ max: 100 }),
			}));
		});

		describe("update locked", () => {
			runTests(() => ({ type: "locked", locked: true }), true);
		});
	});
});
