import { faker } from "@faker-js/faker";
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
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await insertReceipt(ctx, accountId);
			const fakeReceiptId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure(getValidReceiptItem(fakeReceiptId)),
				"NOT_FOUND",
				`Receipt "${fakeReceiptId}" does not exist.`,
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

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(getValidReceiptItem(foreignReceiptId)),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not allowed to be modified by "${account.email}"`,
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

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(getValidReceiptItem(foreignReceiptId)),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not allowed to be modified by "${account.email}" with role "viewer"`,
			);
		});
	});

	describe("functionality", () => {
		test("own receipt", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);

			// Verify unrelated data doesn't affect the result
			await insertReceipt(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertReceipt(ctx, foreignAccountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure(getValidReceiptItem(receiptId)),
			);
			expect(result.id).toMatch(UUID_REGEX);
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				createdAt: new Date(),
			});
		});

		test("foreign receipt", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
				foreignAccountId,
				accountId,
			]);
			const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
			await insertReceiptParticipant(ctx, receiptId, foreignToSelfUserId, {
				role: "editor",
			});

			// Verify unrelated data doesn't affect the result
			await insertReceipt(ctx, accountId);
			await insertReceipt(ctx, foreignAccountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure(getValidReceiptItem(receiptId)),
			);
			expect(result.id).toMatch(UUID_REGEX);
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				createdAt: new Date(),
			});
		});
	});
});
