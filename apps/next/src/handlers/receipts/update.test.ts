import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
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

import { procedure } from "./update";
import {
	getRandomCurrencyCode,
	verifyCurrencyCode,
	verifyIssued,
	verifyName,
	verifyReceiptId,
} from "./utils.test";

const router = t.router({ procedure });

const updateDescribes = (
	getUpdate: () => TRPCMutationInput<"receipts.update">["update"],
	isLockedTimestampUpdated: (lockedBefore: boolean) => boolean,
	getNextTimestamp: () => Date | undefined = () => new Date(),
) => {
	const runTest = async ({
		ctx,
		lockedBefore,
	}: {
		ctx: TestContext;
		lockedBefore: boolean;
	}) => {
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
		await insertReceiptParticipant(ctx, foreignReceiptId, foreignUserId);
		await insertReceiptItem(ctx, foreignReceiptId);

		const caller = router.createCaller(createAuthContext(ctx, sessionId));
		const result = await expectDatabaseDiffSnapshot(ctx, () =>
			caller.procedure({ id: receiptId, update: getUpdate() }),
		);
		expect(result).toStrictEqual<typeof result>(
			isLockedTimestampUpdated(lockedBefore)
				? { lockedTimestamp: getNextTimestamp() }
				: {},
		);
	};

	test("locked before update", async ({ ctx }) => {
		await runTest({ ctx, lockedBefore: true });
	});
	test("unlocked before update", async ({ ctx }) => {
		await runTest({ ctx, lockedBefore: false });
	});
};

describe("receipts.update", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({
				id: faker.string.uuid(),
				update: { type: "name", name: faker.lorem.words() },
			}),
		);

		verifyReceiptId(
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

		verifyIssued(
			(context, issued) =>
				router.createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { type: "issued", issued },
				}),
			"update.",
		);

		verifyCurrencyCode(
			(context, currencyCode) =>
				router.createCaller(context).procedure({
					id: faker.string.uuid(),
					update: { type: "currencyCode", currencyCode },
				}),
			"update.",
		);

		test("receipt not found", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			// Verifying adding other receipts doesn't affect the error
			await insertReceipt(ctx, accountId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
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

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
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

		test("receipt cannot be locked with items with no participants", async ({
			ctx,
		}) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptItem(ctx, receiptId);

			// Verifying adding other receipts doesn't affect the error
			await insertReceipt(ctx, accountId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: receiptId,
						update: { type: "locked", locked: true },
					}),
				"FORBIDDEN",
				`Receipt "${receiptId}" has items with no participants.`,
			);
		});
	});

	describe("functionality", () => {
		describe("update name", () => {
			updateDescribes(
				() => ({ type: "name", name: faker.lorem.words() }),
				() => false,
			);
		});

		describe("update issued", () => {
			updateDescribes(
				() => ({ type: "issued", issued: new Date("2020-06-01") }),
				() => false,
			);
		});

		describe("update currency code", () => {
			updateDescribes(
				() => ({ type: "currencyCode", currencyCode: getRandomCurrencyCode() }),
				(lockedBefore) => lockedBefore,
			);
		});

		describe("update locked - true", () => {
			updateDescribes(
				() => ({ type: "locked", locked: true }),
				() => true,
			);
		});

		describe("update locked - false", () => {
			updateDescribes(
				() => ({ type: "locked", locked: false }),
				() => true,
				() => undefined,
			);
		});
	});
});
