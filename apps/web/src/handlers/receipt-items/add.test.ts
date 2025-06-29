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
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await insertReceipt(ctx, accountId);
			const fakeReceiptId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure(getValidReceiptItem(fakeReceiptId)),
				"NOT_FOUND",
				`Receipt "${fakeReceiptId}" does not exist.`,
			);
		});

		test("receipt is not owned by an account", async ({ ctx }) => {
			const { sessionId, accountId, account } =
				await insertAccountWithSession(ctx);
			await insertReceipt(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(getValidReceiptItem(foreignReceiptId)),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not allowed to be modified by "${account.email}"`,
			);
		});

		test("receipt role is lower than editor", async ({ ctx }) => {
			const { sessionId, accountId, account } =
				await insertAccountWithSession(ctx);
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

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(getValidReceiptItem(foreignReceiptId)),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not allowed to be modified by "${account.email}" with role "viewer"`,
			);
		});

		test("mixed success and fail", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const { id: receiptId } = await insertReceipt(ctx, accountId);
			const fakeReceiptId = faker.string.uuid();

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const results = await expectDatabaseDiffSnapshot(ctx, () =>
				runInBand([
					() => caller.procedure(getValidReceiptItem(receiptId)),
					() =>
						caller
							.procedure(getValidReceiptItem(fakeReceiptId))
							.catch((e) => e),
				]),
			);

			expect(results[0]).toStrictEqual<(typeof results)[0]>({
				id: results[0].id,
				createdAt: new Date(),
			});
			expect(results[1]).toBeInstanceOf(TRPCError);
		});
	});

	describe("functionality", () => {
		test("items are added", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
				foreignAccountId,
				accountId,
			]);

			const { id: receiptId } = await insertReceipt(ctx, accountId);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfUserId,
				{ role: "editor" },
			);

			// Verify unrelated data doesn't affect the result
			await insertReceipt(ctx, accountId);
			await insertReceipt(ctx, foreignAccountId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const results = await expectDatabaseDiffSnapshot(ctx, () =>
				runInBand([
					() => caller.procedure(getValidReceiptItem(receiptId)),
					() => caller.procedure(getValidReceiptItem(receiptId)),
					() => caller.procedure(getValidReceiptItem(foreignReceiptId)),
				]),
			);
			results.forEach((result) => {
				expect(result.id).toMatch(UUID_REGEX);
			});
			expect(results).toStrictEqual<typeof results>([
				{
					id: results[0].id,
					createdAt: new Date(),
				},
				{
					id: results[1].id,
					createdAt: new Date(),
				},
				{
					id: results[2].id,
					createdAt: new Date(),
				},
			]);
		});
	});
});
