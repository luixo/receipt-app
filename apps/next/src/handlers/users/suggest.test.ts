import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertReceipt,
	insertReceiptParticipant,
	insertUser,
} from "@tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import {
	MAX_LIMIT,
	MAX_OFFSET,
	MAX_SUGGEST_LENGTH,
} from "app/utils/validation";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./suggest";
import { mapUserToSuggestResult } from "./test.utils";

const router = t.router({ procedure });

describe("users.suggest", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({
				input: faker.string.alpha(),
				limit: 1,
				options: { type: "debts" },
			}),
		);

		describe("input", () => {
			test("is too long", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: "a".repeat(MAX_SUGGEST_LENGTH + 1),
							limit: 1,
							options: { type: "debts" },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "input": String must contain at most 255 character(s)`,
				);
			});
		});

		describe("limit", () => {
			test("is <= 0", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: 0,
							options: { type: "debts" },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Number must be greater than 0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: MAX_LIMIT + 1,
							options: { type: "debts" },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Number must be less than or equal to 100`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: faker.number.float(),
							options: { type: "debts" },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Expected integer, received float`,
				);
			});
		});

		describe("cursor", () => {
			test("is < 0", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: 1,
							cursor: -1,
							options: { type: "debts" },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Number must be greater than or equal to 0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: 1,
							cursor: MAX_OFFSET + 1,
							options: { type: "debts" },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Number must be less than or equal to 10000`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: 1,
							cursor: faker.number.float(),
							options: { type: "debts" },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Expected integer, received float`,
				);
			});
		});

		describe("filtered ids", () => {
			test("has non-uuid values", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: 1,
							filterIds: [faker.string.alpha()],
							options: { type: "debts" },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "filterIds[0]": Invalid uuid`,
				);
			});
		});

		describe("non-connected receipt id", () => {
			test("has non-uuid value", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: 1,
							options: {
								type: "not-connected-receipt",
								receiptId: faker.string.alpha(),
							},
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "options.receiptId": Invalid uuid`,
				);
			});
		});

		test("receipt does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			// Verifying adding other receipts don't affect the error
			await insertReceipt(ctx, accountId);
			const nonExistentReceiptId = faker.string.uuid();
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						input: faker.string.alpha(),
						limit: 1,
						options: {
							type: "not-connected-receipt",
							receiptId: nonExistentReceiptId,
						},
					}),
				"NOT_FOUND",
				`Receipt "${nonExistentReceiptId}" does not exist.`,
			);
		});

		test("has no role in a requested receipt", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: receiptId } = await insertReceipt(ctx, otherAccountId);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						input: faker.string.alpha(),
						limit: 1,
						options: {
							type: "not-connected-receipt",
							receiptId,
						},
					}),
				"FORBIDDEN",
				`Not enough rights to view receipt "${receiptId}".`,
			);
		});
	});

	describe("functionality", () => {
		test("returns matched users with no restrictions", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const accounts = await Promise.all([
				insertAccount(ctx),
				insertAccount(ctx),
			]);

			const matchedUsers = await Promise.all([
				insertUser(ctx, accountId, { name: "Alice from work" }),
				insertUser(ctx, accountId, { name: "Alice from school" }),
				insertUser(ctx, accountId, { name: "Alice from gym" }),
			]);
			const [connectedMatchedUser] = await insertConnectedUsers(ctx, [
				{ accountId, name: "Connected Alice" },
				accounts[0].id,
			]);
			matchedUsers.push(connectedMatchedUser);
			await insertUser(ctx, accountId, { name: "Bob" });
			await insertConnectedUsers(ctx, [
				{ accountId, name: "Connected Bob" },
				accounts[1].id,
			]);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				input: "Alice",
				limit: 10,
				options: { type: "debts" },
			});
			expect(result).toStrictEqual<typeof result>({
				items: mapUserToSuggestResult(matchedUsers, accounts).sort((a, b) =>
					// Users with same similarity are sorted by id
					a.id.localeCompare(b.id),
				),
				cursor: 0,
				hasMore: false,
			});
		});

		test("returns results with short request", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const matchedUsers = await Promise.all([
				insertUser(ctx, accountId, { name: "Ally" }),
				insertUser(ctx, accountId, { name: "Alice" }),
				insertUser(ctx, accountId, { name: "Aliko" }),
			]);
			const result = await caller.procedure({
				input: "Al",
				limit: 10,
				options: { type: "debts" },
			});
			expect(result).toStrictEqual<typeof result>({
				items: mapUserToSuggestResult(matchedUsers, []).sort((a, b) =>
					// Shorter requests are sorted by name, not by similarity
					a.name.localeCompare(b.name),
				),
				cursor: 0,
				hasMore: false,
			});
		});

		test("returns empty results", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				input: "Alice",
				limit: 10,
				options: { type: "debts" },
			});
			expect(result).toStrictEqual<typeof result>({
				items: [],
				cursor: 0,
				hasMore: false,
			});
		});

		test("returns matched users not connected to a given receipt", async ({
			ctx,
		}) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const accounts = await Promise.all([
				insertAccount(ctx),
				insertAccount(ctx),
			]);

			const { id: receiptId } = await insertReceipt(ctx, accountId);

			const { id: filteredUserId } = await insertUser(ctx, accountId, {
				name: "Alice from work",
			});
			const { id: participatingUserId } = await insertUser(ctx, accountId, {
				name: "Alice from school",
			});
			const matchedUsers = await Promise.all([
				insertUser(ctx, accountId, { name: "Alice from gym" }),
			]);
			const [matchedConnectedUser] = await insertConnectedUsers(ctx, [
				{ accountId, name: "Connected Alice" },
				accounts[0].id,
			]);
			matchedUsers.push(matchedConnectedUser);
			await insertUser(ctx, accountId, { name: "Bob" });
			await insertConnectedUsers(ctx, [
				{ accountId, name: "Connected Bob" },
				accounts[1].id,
			]);

			await insertReceiptParticipant(ctx, receiptId, participatingUserId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				input: "Alice",
				limit: 10,
				filterIds: [filteredUserId],
				options: { type: "not-connected-receipt", receiptId },
			});
			expect(result).toStrictEqual<typeof result>({
				items: mapUserToSuggestResult(matchedUsers, accounts).sort((a, b) =>
					// Users with same similarity are sorted by id
					a.id.localeCompare(b.id),
				),
				cursor: 0,
				hasMore: false,
			});
		});

		test("returns matched users with no connected account", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const accounts = await Promise.all([
				insertAccount(ctx),
				insertAccount(ctx),
			]);

			const matchedUsers = await Promise.all([
				insertUser(ctx, accountId, { name: "Alice from work" }),
				insertUser(ctx, accountId, { name: "Alice from school" }),
				insertUser(ctx, accountId, { name: "Alice from gym" }),
			]);
			await insertConnectedUsers(ctx, [
				{ accountId, name: "Connected Alice" },
				accounts[0].id,
			]);
			await insertUser(ctx, accountId, { name: "Bob from work" });
			await insertConnectedUsers(ctx, [
				{ accountId, name: "Connected Bob" },
				accounts[1].id,
			]);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				input: "Alice",
				limit: 10,
				options: { type: "not-connected" },
			});
			expect(result).toStrictEqual<typeof result>({
				items: mapUserToSuggestResult(matchedUsers, accounts).sort((a, b) =>
					// Users with same similarity are sorted by id
					a.id.localeCompare(b.id),
				),
				cursor: 0,
				hasMore: false,
			});
		});

		test("returns fuzzily matched users", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const matchedUsers = await Promise.all([
				insertUser(ctx, accountId, { name: "Alice from work" }),
				insertUser(ctx, accountId, { name: "Alice from school" }),
				insertUser(ctx, accountId, { name: "Alide - a typo" }),
			]);
			// Too fuzzy - should not be returned
			await insertUser(ctx, accountId, { name: "Alcc - a heavier typo" });

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				input: "Alice",
				limit: 10,
				options: { type: "debts" },
			});
			expect(result).toStrictEqual({
				// Order of matched users is important - they are sorted by fuzziness
				items: mapUserToSuggestResult(matchedUsers, []),
				cursor: 0,
				hasMore: false,
			});
		});

		test("returns paged results", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const limit = 2;
			await Promise.all(
				Array.from({ length: limit }, async (_, index) => {
					await insertUser(ctx, accountId, { name: `Alice ${index}` });
					if (index !== 0) {
						await insertUser(ctx, accountId, {
							name: `Alice ${index} - additional`,
						});
					}
				}),
			);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const firstPage = await caller.procedure({
				input: "Alice",
				limit,
				options: { type: "debts" },
			});
			expect(firstPage.items.length).toBe(limit);
			expect(firstPage.cursor).toBe(0);
			expect(firstPage.hasMore).toBe(true);
			const secondPage = await caller.procedure({
				input: "Alice",
				cursor: firstPage.cursor + limit,
				limit,
				options: { type: "debts" },
			});
			expect(secondPage.items.length).toBeLessThan(limit);
			expect(secondPage.cursor).toBe(limit);
			expect(secondPage.hasMore).toBe(false);
		});

		test("returns users with given filtered users", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const accounts = await Promise.all([insertAccount(ctx)]);

			const { id: filteredUserId } = await insertUser(ctx, accountId, {
				name: "Alice from work",
			});
			const matchedUsers = await Promise.all([
				insertUser(ctx, accountId, { name: "Alice from school" }),
				insertUser(ctx, accountId, { name: "Alice from gym" }),
			]);
			const [connectedMatchedUser] = await insertConnectedUsers(ctx, [
				{ accountId, name: "Connected Alice" },
				accounts[0].id,
			]);
			matchedUsers.push(connectedMatchedUser);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				input: "Alice",
				limit: 10,
				filterIds: [filteredUserId],
				options: { type: "debts" },
			});
			expect(result).toStrictEqual<typeof result>({
				items: mapUserToSuggestResult(matchedUsers, accounts).sort((a, b) =>
					// Users with same similarity are sorted by id
					a.id.localeCompare(b.id),
				),
				cursor: 0,
				hasMore: false,
			});
		});
	});
});
