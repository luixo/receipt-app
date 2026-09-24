import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import type { TRPCMutationInput } from "~app/trpc";
import { createAuthContext } from "~tests/backend/utils/context";
import {
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
	await insertReceiptParticipant(ctx, foreignReceiptId, foreignPeerId);
	await insertReceiptItem(ctx, foreignReceiptId);

	const caller = createCaller(createAuthContext(ctx, sessionId));
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
			const { sessionId, userId } = await insertUserWithSession(ctx);

			// Verifying adding other receipts doesn't affect the error
			await insertReceipt(ctx, userId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
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

		test("receipt is not owned by the  user", async ({ ctx }) => {
			// Self  user
			const {
				sessionId,
				userId,
				user: { email },
			} = await insertUserWithSession(ctx);
			// Foreign  user
			const { id: otherUserId } = await insertUser(ctx);
			const { id: foreignReceiptId } = await insertReceipt(ctx, otherUserId);

			// Verifying adding other receipts doesn't affect the error
			await insertReceipt(ctx, userId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
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
				issued: Temporal.PlainDate.from("2020-06-01"),
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
