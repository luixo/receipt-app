import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountSettings,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertReceipt,
	insertReceiptParticipant,
	insertUser,
} from "@tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { MAX_BATCH_DEBTS, MIN_BATCH_DEBTS } from "app/utils/validation";
import { t } from "next-app/handlers/trpc";
import { UUID_REGEX } from "next-app/handlers/validation";

import { procedure } from "./add-batch";
import {
	getValidDebt,
	verifyAmount,
	verifyCurrencyCode,
	verifyNote,
	verifyReceiptId,
	verifyTimestamp,
	verifyUserId,
} from "./utils.test";

const router = t.router({ procedure });

describe("debts.addBatch", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure([getValidDebt()]),
		);

		describe("input array", () => {
			test("minimal length", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure([]),
					"BAD_REQUEST",
					`Zod error\n\nAt "<root>": Minimal amount of batched debts is ${MIN_BATCH_DEBTS}`,
				);
			});

			test("maximum length", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure(
							Array.from({ length: MAX_BATCH_DEBTS + 1 }, () => getValidDebt()),
						),
					"BAD_REQUEST",
					`Zod error\n\nAt "<root>": Maximum amount of batched debts is ${MAX_BATCH_DEBTS}`,
				);
			});
		});

		verifyAmount(
			(context, amount) =>
				router.createCaller(context).procedure([{ ...getValidDebt(), amount }]),
			"[0].",
		);

		verifyNote(
			(context, note) =>
				router.createCaller(context).procedure([{ ...getValidDebt(), note }]),
			"[0].",
		);

		verifyCurrencyCode(
			(context, currencyCode) =>
				router
					.createCaller(context)
					.procedure([{ ...getValidDebt(), currencyCode }]),
			"[0].",
		);

		verifyTimestamp(
			(context, timestamp) =>
				router
					.createCaller(context)
					.procedure([{ ...getValidDebt(), timestamp }]),
			"[0].",
		);

		verifyReceiptId(
			(context, receiptId) =>
				router
					.createCaller(context)
					.procedure([{ ...getValidDebt(), receiptId }]),
			"[0].",
		);

		verifyUserId(
			(context, userId) =>
				router.createCaller(context).procedure([getValidDebt(userId)]),
			"[0].",
		);

		test("users do not exist", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const fakeUserId = faker.string.uuid();
			const anotherFakeUserId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure([
						getValidDebt(fakeUserId),
						getValidDebt(anotherFakeUserId),
					]),
				"NOT_FOUND",
				`Users "${fakeUserId}", "${anotherFakeUserId}" do not exist.`,
			);
		});

		test("users are not owned by an account", async ({ ctx }) => {
			const { sessionId, accountId, account } = await insertAccountWithSession(
				ctx,
			);
			await insertUser(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
			const { id: anotherForeignUserId } = await insertUser(
				ctx,
				foreignAccountId,
			);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure([
						getValidDebt(foreignUserId),
						getValidDebt(anotherForeignUserId),
					]),
				"FORBIDDEN",
				`Users "${foreignUserId}", "${anotherForeignUserId}" are not owned by "${account.email}".`,
			);
		});

		test("user is ourselves", async ({ ctx }) => {
			const { sessionId, userId } = await insertAccountWithSession(ctx);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure([getValidDebt(userId)]),
				"FORBIDDEN",
				`Cannot add debts for yourself.`,
			);
		});

		test("there is a receipt id debt with that user", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			const { id: userId } = await insertUser(ctx, accountId);
			await insertReceiptParticipant(ctx, receiptId, userId);
			await insertDebt(ctx, accountId, userId, { receiptId });

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure([
						{
							...getValidDebt(userId),
							receiptId,
						},
					]),
				"FORBIDDEN",
				`There is already a debt for user "${userId}" in receipt "${receiptId}".`,
			);
		});

		test("there is a receipt id reverse debt with that user", async ({
			ctx,
		}) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx, {
				settings: { autoAcceptDebts: true },
			});
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			const [{ id: foreignUserId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
			await insertReceiptParticipant(ctx, receiptId, foreignUserId);
			await insertDebt(ctx, foreignAccountId, foreignToSelfUserId, {
				receiptId,
			});

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure([
						{
							...getValidDebt(foreignUserId),
							receiptId,
						},
					]),
				"FORBIDDEN",
				`There is already a debt for user "${foreignToSelfUserId}" in receipt "${receiptId}".`,
			);
		});
	});

	describe("functionality", () => {
		test("debts are added - autogenerated timestamp", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);
			const { id: anotherUserId } = await insertUser(ctx, accountId);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			await insertAccountSettings(ctx, accountId, { autoAcceptDebts: true });
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertUser(ctx, foreignAccountId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure([getValidDebt(userId), getValidDebt(anotherUserId)]),
			);
			result.ids.every((id) => expect(id).toMatch(UUID_REGEX));
			expect(result).toStrictEqual<typeof result>({
				ids: result.ids,
				lockedTimestamp: new Date(),
				reverseAcceptedUserIds: [],
			});
		});

		test("debts are added - user-provided timestamp", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);
			const { id: anotherUserId } = await insertUser(ctx, accountId);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			await insertAccountSettings(ctx, accountId, { autoAcceptDebts: true });
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertUser(ctx, foreignAccountId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure([
					{ ...getValidDebt(userId), timestamp: new Date("2021-01-01") },
					{ ...getValidDebt(anotherUserId), timestamp: new Date("2021-01-01") },
				]),
			);
			result.ids.every((id) => expect(id).toMatch(UUID_REGEX));
			expect(result).toStrictEqual<typeof result>({
				ids: result.ids,
				lockedTimestamp: new Date(),
				reverseAcceptedUserIds: [],
			});
		});

		test("debts are added - some are auto-accepted by the counterparty", async ({
			ctx,
		}) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: acceptingForeignAccountId } = await insertAccount(ctx, {
				settings: { autoAcceptDebts: true },
			});
			const { id: anotherAcceptingForeignAccountId } = await insertAccount(
				ctx,
				{ settings: { autoAcceptDebts: true } },
			);
			const { id: otherForeignAccountId } = await insertAccount(ctx);

			const [{ id: acceptingUserId }] = await insertConnectedUsers(ctx, [
				accountId,
				acceptingForeignAccountId,
			]);
			const [{ id: anotherAcceptingUserId }] = await insertConnectedUsers(ctx, [
				accountId,
				anotherAcceptingForeignAccountId,
			]);
			const [{ id: otherUserId }] = await insertConnectedUsers(ctx, [
				accountId,
				otherForeignAccountId,
			]);
			const { id: receiptId } = await insertReceipt(ctx, accountId);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			await insertAccountSettings(ctx, accountId, { autoAcceptDebts: true });
			await insertUser(ctx, acceptingForeignAccountId);
			await insertUser(ctx, anotherAcceptingForeignAccountId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure([
					{ ...getValidDebt(acceptingUserId), receiptId },
					getValidDebt(acceptingUserId),
					getValidDebt(anotherAcceptingUserId),
					getValidDebt(otherUserId),
				]),
			);
			result.ids.every((id) => expect(id).toMatch(UUID_REGEX));
			expect(result).toStrictEqual<typeof result>({
				ids: result.ids,
				lockedTimestamp: new Date(),
				reverseAcceptedUserIds: [acceptingUserId, anotherAcceptingUserId],
			});
		});
	});
});
