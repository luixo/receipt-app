import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertConnectedPeers,
	insertReceipt,
	insertReceiptParticipant,
	insertUser,
	insertUserWithSession,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { runInBand } from "~web/handlers/utils.test";
import { UUID_REGEX } from "~web/handlers/validation";

import { procedure } from "./add";
import {
	getValidReceiptItem,
	verifyName,
	verifyPrice,
	verifyQuantity,
} from "./utils.test";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receiptItems.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure(getValidReceiptItem()),
		);

		verifyName(
			(context, name) =>
				createCaller(context).procedure({ ...getValidReceiptItem(), name }),
			"",
		);

		verifyPrice(
			(context, price) =>
				createCaller(context).procedure({ ...getValidReceiptItem(), price }),
			"",
		);

		verifyQuantity(
			(context, quantity) =>
				createCaller(context).procedure({ ...getValidReceiptItem(), quantity }),
			"",
		);

		test("receipt does not exist", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await insertReceipt(ctx, userId);
			const fakeReceiptId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure(getValidReceiptItem(fakeReceiptId)),
				"NOT_FOUND",
				`Receipt "${fakeReceiptId}" does not exist.`,
			);
		});

		test("receipt is not owned by an  user", async ({ ctx }) => {
			const { sessionId, userId, user } = await insertUserWithSession(ctx);
			await insertReceipt(ctx, userId);

			const { id: foreignUserId } = await insertUser(ctx);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(getValidReceiptItem(foreignReceiptId)),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not allowed to be modified by "${user.email}"`,
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

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(getValidReceiptItem(foreignReceiptId)),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not allowed to be modified by "${user.email}" with role "viewer"`,
			);
		});

		test("mixed success and fail", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);

			const { id: receiptId } = await insertReceipt(ctx, userId);
			const fakeReceiptId = faker.string.uuid();

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const results = await expectDatabaseDiffSnapshot(ctx, () =>
				runInBand([
					() => caller.procedure(getValidReceiptItem(receiptId)),
					() =>
						caller
							.procedure(getValidReceiptItem(fakeReceiptId))
							.catch((error) => error),
				]),
			);

			expect(results[0]).toStrictEqual<(typeof results)[0]>({
				id: results[0].id,
				createdAt: Temporal.Now.zonedDateTimeISO(),
			});
			expect(results[1]).toBeInstanceOf(TRPCError);
		});
	});

	describe("functionality", () => {
		test("items are added", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx);
			const [{ id: foreignToSelfPeerId }] = await insertConnectedPeers(ctx, [
				foreignUserId,
				userId,
			]);

			const { id: receiptId } = await insertReceipt(ctx, userId);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfPeerId,
				{ role: "editor" },
			);

			// Verify unrelated data doesn't affect the result
			await insertReceipt(ctx, userId);
			await insertReceipt(ctx, foreignUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const results = await expectDatabaseDiffSnapshot(ctx, () =>
				runInBand([
					() => caller.procedure(getValidReceiptItem(receiptId)),
					() => caller.procedure(getValidReceiptItem(receiptId)),
					() => caller.procedure(getValidReceiptItem(foreignReceiptId)),
				]),
			);
			for (const result of results) {
				expect(result.id).toMatch(UUID_REGEX);
			}
			expect(results).toStrictEqual<typeof results>([
				{
					id: results[0].id,
					createdAt: Temporal.Now.zonedDateTimeISO(),
				},
				{
					id: results[1].id,
					createdAt: Temporal.Now.zonedDateTimeISO(),
				},
				{
					id: results[2].id,
					createdAt: Temporal.Now.zonedDateTimeISO(),
				},
			]);
		});
	});
});
