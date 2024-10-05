import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountSettings,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertReceipt,
	insertReceiptParticipant,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectLocalTRPCError,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { UUID_REGEX } from "~web/handlers/validation";

import { procedure } from "./add";
import {
	getValidDebt,
	runSequentially,
	verifyAmount,
	verifyCurrencyCode,
	verifyNote,
	verifyReceiptId,
	verifyTimestamp,
	verifyUserId,
} from "./utils.test";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debts.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure(getValidDebt()),
		);

		verifyAmount(
			(context, amount) =>
				createCaller(context).procedure({ ...getValidDebt(), amount }),
			"",
		);

		verifyNote(
			(context, note) =>
				createCaller(context).procedure({ ...getValidDebt(), note }),
			"",
		);

		verifyCurrencyCode(
			(context, currencyCode) =>
				createCaller(context).procedure({ ...getValidDebt(), currencyCode }),
			"",
		);

		verifyTimestamp(
			(context, timestamp) =>
				createCaller(context).procedure({ ...getValidDebt(), timestamp }),
			"",
		);

		verifyReceiptId(
			(context, receiptId) =>
				createCaller(context).procedure({ ...getValidDebt(), receiptId }),
			"",
		);

		verifyUserId(
			(context, userId) =>
				createCaller(context).procedure(getValidDebt(userId)),
			"",
		);

		test("user does not exist", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const fakeUserId = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure(getValidDebt(fakeUserId)),
				"NOT_FOUND",
				`User "${fakeUserId}" does not exist.`,
			);
		});

		test("user is not owned by an account", async ({ ctx }) => {
			const { sessionId, accountId, account } = await insertAccountWithSession(
				ctx,
			);
			await insertUser(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(getValidDebt(foreignUserId)),
				"FORBIDDEN",
				`User "${foreignUserId}" is not owned by "${account.email}".`,
			);
		});

		test("user is ourselves", async ({ ctx }) => {
			const { sessionId, userId } = await insertAccountWithSession(ctx);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(getValidDebt(userId)),
				"FORBIDDEN",
				`Cannot add a debt for yourself.`,
			);
		});

		test("there is a receipt id debt with that user", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			const { id: userId } = await insertUser(ctx, accountId);
			await insertReceiptParticipant(ctx, receiptId, userId);
			await insertDebt(ctx, accountId, userId, { receiptId });

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						...getValidDebt(userId),
						receiptId,
					}),
				"FORBIDDEN",
				`There is already a debt for user "${userId}" in receipt "${receiptId}".`,
			);
		});
	});

	describe("functionality", () => {
		test("debt is added - autogenerated timestamp", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			await insertAccountSettings(ctx, accountId, { manualAcceptDebts: true });
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertUser(ctx, foreignAccountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure(getValidDebt(userId)),
			);
			expect(result.id).toMatch(UUID_REGEX);
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				updatedAt: new Date(),
				reverseAccepted: false,
			});
		});

		test("debt is added - user-provided timestamp", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			await insertAccountSettings(ctx, accountId, { manualAcceptDebts: true });
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertUser(ctx, foreignAccountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					...getValidDebt(userId),
					timestamp: new Date("2021-01-01"),
				}),
			);
			expect(result.id).toMatch(UUID_REGEX);
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				updatedAt: new Date(),
				reverseAccepted: false,
			});
		});

		describe("multiple debts", () => {
			test("some are auto-accepted by the counterparty", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const { id: anotherForeignAccountId } = await insertAccount(ctx);
				const { id: nonAcceptingForeignAccountId } = await insertAccount(ctx, {
					settings: { manualAcceptDebts: true },
				});

				const [{ id: foreignUserId }] = await insertConnectedUsers(ctx, [
					accountId,
					foreignAccountId,
				]);
				const [{ id: anotherForeignUserId }] = await insertConnectedUsers(ctx, [
					accountId,
					anotherForeignAccountId,
				]);
				const [{ id: nonAcceptingUserId }] = await insertConnectedUsers(ctx, [
					accountId,
					nonAcceptingForeignAccountId,
				]);
				const { id: receiptId } = await insertReceipt(ctx, accountId);

				// Verify unrelated data doesn't affect the result
				await insertUser(ctx, accountId);
				await insertAccountSettings(ctx, accountId, {
					manualAcceptDebts: true,
				});
				await insertUser(ctx, foreignAccountId);
				await insertUser(ctx, anotherForeignAccountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await expectDatabaseDiffSnapshot(ctx, () =>
					runSequentially(
						[
							() =>
								caller.procedure({
									...getValidDebt(foreignUserId),
									receiptId,
								}),
							() => caller.procedure(getValidDebt(foreignUserId)),
							() => caller.procedure(getValidDebt(anotherForeignUserId)),
							() => caller.procedure(getValidDebt(nonAcceptingUserId)),
						],
						10,
					),
				);
				expect(results).toHaveLength(4);
				results
					.map(({ id }) => id)
					.forEach((id) => expect(id).toMatch(UUID_REGEX));
				expect(results).toStrictEqual<typeof results>(
					results.map(({ id }, index) => ({
						id,
						updatedAt: new Date(),
						// see Promise.all - accepting users are 0, 1 and 2 indexes
						reverseAccepted: index <= 2,
					})) as typeof results,
				);
			});

			test("for the same auto-accepting account", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);

				const [{ id: foreignUserId }] = await insertConnectedUsers(ctx, [
					accountId,
					foreignAccountId,
				]);

				// Verify unrelated data doesn't affect the result
				await insertUser(ctx, accountId);
				await insertAccountSettings(ctx, accountId, {
					manualAcceptDebts: true,
				});
				await insertUser(ctx, foreignAccountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await expectDatabaseDiffSnapshot(ctx, () =>
					runSequentially(
						[
							() => caller.procedure(getValidDebt(foreignUserId)),
							() => caller.procedure(getValidDebt(foreignUserId)),
							() => caller.procedure(getValidDebt(foreignUserId)),
						],
						10,
					),
				);
				expect(results).toHaveLength(3);
				results
					.map(({ id }) => id)
					.forEach((id) => expect(id).toMatch(UUID_REGEX));
				expect(results).toStrictEqual<typeof results>(
					results.map(({ id }) => ({
						id,
						updatedAt: new Date(),
						// see Promise.all - all users are accepting
						reverseAccepted: true,
					})) as typeof results,
				);
			});

			test("some auto-accepting accounts already had debts picked by the same receipt id", async ({
				ctx,
			}) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);

				const [{ id: foreignUserId }, { id: selfUserId }] =
					await insertConnectedUsers(ctx, [accountId, foreignAccountId]);

				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				const { id: counterpartyId } = await insertDebt(
					ctx,
					foreignAccountId,
					selfUserId,
					{ receiptId },
				);

				// Verify unrelated data doesn't affect the result
				await insertUser(ctx, accountId);
				await insertAccountSettings(ctx, accountId, {
					manualAcceptDebts: true,
				});
				await insertUser(ctx, foreignAccountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await expectDatabaseDiffSnapshot(ctx, () =>
					runSequentially(
						[
							() =>
								caller.procedure({
									...getValidDebt(foreignUserId),
									receiptId,
								}),
							() => caller.procedure(getValidDebt(foreignUserId)),
							() => caller.procedure(getValidDebt(foreignUserId)),
						],
						10,
					),
				);
				expect(results).toHaveLength(3);
				results
					.map(({ id }) => id)
					.forEach((id) => expect(id).toMatch(UUID_REGEX));
				expect(results).toStrictEqual<typeof results>(
					results.map(({ id }) => ({
						id,
						updatedAt: new Date(),
						// see Promise.all - all users are accepting
						reverseAccepted: true,
					})) as typeof results,
				);
				expect(results[0].id).toEqual(counterpartyId);
			});

			test("partially with errors", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);

				const fakeUserId = faker.string.uuid();
				const [{ id: foreignUserId }] = await insertConnectedUsers(ctx, [
					accountId,
					foreignAccountId,
				]);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await runSequentially(
					[
						() => caller.procedure(getValidDebt(foreignUserId)),
						() => caller.procedure(getValidDebt(fakeUserId)).catch((e) => e),
					],
					10,
				);
				expect(results).toHaveLength(2);
				expect(results[0].id).toMatch(UUID_REGEX);
				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					id: results[0].id,
					updatedAt: new Date(),
					reverseAccepted: true,
				});
				expect(results[1]).toBeInstanceOf(Error);
				expectLocalTRPCError(
					results[1] as Error,
					"NOT_FOUND",
					`User "${fakeUserId}" does not exist.`,
				);
			});
		});

		describe("auto-accepted by the counterparty", () => {
			test("counterparty's debt didn't exist before", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: foreignUserId }] = await insertConnectedUsers(ctx, [
					accountId,
					foreignAccountId,
				]);
				const { id: receiptId } = await insertReceipt(ctx, accountId);

				// Verify unrelated data doesn't affect the result
				await insertUser(ctx, accountId);
				await insertAccountSettings(ctx, accountId, {
					manualAcceptDebts: true,
				});
				await insertUser(ctx, foreignAccountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ ...getValidDebt(foreignUserId), receiptId }),
				);
				expect(result.id).toMatch(UUID_REGEX);
				expect(result).toStrictEqual<typeof result>({
					id: result.id,
					updatedAt: new Date(),
					reverseAccepted: true,
				});
			});

			test("counterparty's debt did exist before - picked by receipt id & owner account id", async ({
				ctx,
			}) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const [{ id: foreignUserId }, { id: foreignSelfUserId }] =
					await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
				const { id: receiptId } = await insertReceipt(ctx, accountId);

				// Existing counter-debt
				const { id: counterpartyId } = await insertDebt(
					ctx,
					foreignAccountId,
					foreignSelfUserId,
					{ receiptId },
				);

				// Verify unrelated data doesn't affect the result
				await insertUser(ctx, accountId);
				await insertAccountSettings(ctx, accountId, {
					manualAcceptDebts: true,
				});
				await insertUser(ctx, foreignAccountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ ...getValidDebt(foreignUserId), receiptId }),
				);
				expect(result.id).toMatch(UUID_REGEX);
				expect(result).toStrictEqual<typeof result>({
					id: result.id,
					updatedAt: new Date(),
					reverseAccepted: true,
				});
				expect(result.id).toEqual(counterpartyId);
			});
		});
	});
});
