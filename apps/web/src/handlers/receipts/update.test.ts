import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import type { TRPCMutationInput } from "~app/trpc";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
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
import type { TestContext } from "~tests/backend/utils/test";
import { test } from "~tests/backend/utils/test";
import { parsers } from "~utils/date";
import { t } from "~web/handlers/trpc";
import { getRandomCurrencyCode } from "~web/handlers/utils.test";

import { procedure } from "./update";
import {
	verifyCurrencyCode,
	verifyIssued,
	verifyName,
	verifyReceiptId,
} from "./utils.test";

const createCaller = t.createCallerFactory(t.router({ procedure }));

const runTest = async (
	ctx: TestContext,
	getUpdate: () => TRPCMutationInput<"receipts.update">["update"],
) => {
	const { sessionId, accountId } = await insertAccountWithSession(ctx);
	const { id: receiptId } = await insertReceipt(ctx, accountId);
	const { id: userId } = await insertUser(ctx, accountId);
	const { id: receiptItemId } = await insertReceiptItem(ctx, receiptId);
	await insertReceiptParticipant(ctx, receiptId, userId);
	await insertReceiptItemConsumer(ctx, receiptItemId, userId);

	// Verify unrelated data doesn't affect the result
	const { id: anotherUserId } = await insertUser(ctx, accountId);
	const { id: anotherReceiptId } = await insertReceipt(ctx, accountId);
	await insertReceiptParticipant(ctx, anotherReceiptId, anotherUserId);
	await insertReceiptItem(ctx, anotherReceiptId);

	const { id: foreignAccountId } = await insertAccount(ctx);
	const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
	const { id: foreignReceiptId } = await insertReceipt(ctx, foreignAccountId);
	await insertReceiptParticipant(ctx, foreignReceiptId, foreignUserId);
	await insertReceiptItem(ctx, foreignReceiptId);

	const caller = createCaller(await createAuthContext(ctx, sessionId));
	const result = await expectDatabaseDiffSnapshot(ctx, () =>
		caller.procedure({ id: receiptId, update: getUpdate() }),
	);
	expect(result).toStrictEqual<typeof result>(undefined);
};

describe("receipts.update", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				id: faker.string.uuid(),
				update: { type: "name", name: faker.lorem.words() },
			}),
		);

		verifyReceiptId(
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

		verifyIssued(
			(context, issued) =>
				createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { type: "issued", issued },
				}),
			"update.",
		);

		verifyCurrencyCode(
			(context, currencyCode) =>
				createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { type: "currencyCode", currencyCode },
				}),
			"update.",
		);

		test("receipt not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			// Verifying adding other receipts doesn't affect the error
			await insertReceipt(ctx, accountId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const nonExistentReceiptId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						id: nonExistentReceiptId,
						update: { type: "name", name: faker.lorem.words() },
					}),
				"NOT_FOUND",
				`No receipt found by id "${nonExistentReceiptId}".`,
			);
		});

		test("receipt is not owned by the account", async ({ ctx }) => {
			// Self account
			const {
				sessionId,
				accountId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: foreignReceiptId } = await insertReceipt(ctx, otherAccountId);

			// Verifying adding other receipts doesn't affect the error
			await insertReceipt(ctx, accountId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: foreignReceiptId,
						update: { type: "name", name: faker.lorem.words() },
					}),
				"FORBIDDEN",
				`Receipt "${foreignReceiptId}" is not owned by "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		test("update name", async ({ ctx }) => {
			await runTest(ctx, () => ({ type: "name", name: faker.lorem.words() }));
		});

		test("update issued", async ({ ctx }) => {
			await runTest(ctx, () => ({
				type: "issued",
				issued: parsers.plainDate("2020-06-01"),
			}));
		});

		test("update currency code", async ({ ctx }) => {
			await runTest(ctx, () => ({
				type: "currencyCode",
				currencyCode: getRandomCurrencyCode(),
			}));
		});
	});
});
