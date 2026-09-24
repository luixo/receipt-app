import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import type { TRPCMutationInput } from "~app/trpc";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertConnectedPeers,
	insertPeer,
	insertReceipt,
	insertReceiptItem,
	insertReceiptItemConsumer,
	insertReceiptParticipant,
	insertUser,
	insertUserWithSession,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import type { TestContext } from "~tests/backend/utils/test";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./update";
import {
	verifyName,
	verifyPrice,
	verifyQuantity,
	verifyReceiptItemId,
} from "./utils.test";

const createCaller = t.createCallerFactory(t.router({ procedure }));

const runTests = (
	getUpdate: () => TRPCMutationInput<"receiptItems.update">["update"],
) => {
	const runTest = async (ctx: TestContext, type: "own" | "foreign") => {
		const { sessionId, userId } = await insertUserWithSession(ctx);
		const { id: receiptId } = await insertReceipt(ctx, userId);
		const { id: peerId } = await insertPeer(ctx, userId);
		const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
		await insertReceiptParticipant(ctx, receiptId, peerId);
		await insertReceiptItemConsumer(ctx, receiptItemId, peerId);

		// Verify unrelated data doesn't affect the result
		const { id: anotherPeerId } = await insertPeer(ctx, userId);
		const { id: anotherReceiptId } = await insertReceipt(ctx, userId);
		await insertReceiptParticipant(ctx, anotherReceiptId, anotherPeerId);
		await insertReceiptItem(ctx, anotherReceiptId);

		const { id: foreignUserId } = await insertUser(ctx);
		const { id: foreignPeerId } = await insertPeer(ctx, foreignUserId);
		const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
		const [{ id: foreignToSelfPeerId }] = await insertConnectedPeers(ctx, [
			foreignUserId,
			userId,
		]);
		await insertReceiptParticipant(ctx, foreignReceiptId, foreignPeerId);
		await insertReceiptParticipant(ctx, foreignReceiptId, foreignToSelfPeerId, {
			role: "editor",
		});
		const { id: foreignReceiptItemId } = await insertReceiptItem(
			ctx,
			foreignReceiptId,
		);

		const caller = createCaller(createAuthContext(ctx, sessionId));
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
			createCaller(context).procedure({
				id: faker.string.uuid(),
				update: { type: "name", name: faker.lorem.words() },
			}),
		);

		verifyReceiptItemId(
			(context, receiptId) =>
				createCaller(context).procedure({
					id: receiptId,
					update: { type: "name", name: faker.lorem.words() },
				}),
			"",
		);

		verifyName(
			(context, name) =>
				createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { type: "name", name },
				}),
			"update.",
		);

		verifyPrice(
			(context, price) =>
				createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { type: "price", price },
				}),
			"update.",
		);

		verifyQuantity(
			(context, quantity) =>
				createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { type: "quantity", quantity },
				}),
			"update.",
		);

		test("receipt item does not exist", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const { id: receiptId } = await insertReceipt(ctx, userId);
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

		test("receipt is not owned by an  user", async ({ ctx }) => {
			const { sessionId, userId, user } = await insertUserWithSession(ctx);
			await insertReceipt(ctx, userId);

			const { id: foreignUserId } = await insertUser(ctx);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
			const { id: foreignReceiptItemId } = await insertReceiptItem(
				ctx,
				foreignReceiptId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: foreignReceiptItemId,
						update: { type: "name", name: faker.lorem.words() },
					}),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not allowed to be modified by "${user.email}".`,
			);
		});

		test("receipt role is lower than editor", async ({ ctx }) => {
			const { sessionId, userId, user } = await insertUserWithSession(ctx);
			await insertReceipt(ctx, userId);

			const { id: foreignUserId } = await insertUser(ctx);
			const [{ id: foreignToSelfPeerId }] = await insertConnectedPeers(ctx, [
				foreignUserId,
				userId,
			]);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfPeerId,
				{ role: "viewer" },
			);
			const { id: foreignReceiptItemId } = await insertReceiptItem(
				ctx,
				foreignReceiptId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: foreignReceiptItemId,
						update: { type: "name", name: faker.lorem.words() },
					}),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not allowed to be modified by "${user.email}" with role "viewer"`,
			);
		});

		test("payer receipt item", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, userId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: receiptId,
						update: { type: "name", name: faker.lorem.words() },
					}),
				"FORBIDDEN",
				`Payers receipt item cannot be updated.`,
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
	});
});
