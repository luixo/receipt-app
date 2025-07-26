import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect } from "vitest";

import {
	MAX_LIMIT,
	MAX_OFFSET,
	MAX_SUGGEST_LENGTH,
} from "~app/utils/validation";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertReceipt,
	insertReceiptParticipant,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./suggest";

const getTrigrams = (s: string): Set<string> => {
	const words = s.toLowerCase().split(" ");
	return words.reduce((set, word) => {
		const letters = `  ${word} `.split("");
		letters.forEach((_, index) => {
			if (index > letters.length - 3) {
				return set;
			}
			const nextWord = letters.slice(index, index + 3).join("");
			if (!nextWord.trim().includes(" ")) {
				set.add(nextWord);
			}
		});
		return set;
	}, new Set<string>());
};

function trigramSimilarity(a: string, b: string): number {
	const trigramsA = getTrigrams(a);
	const trigramsB = getTrigrams(b);

	if (trigramsA.size === 0) {
		return 0;
	}
	return (
		[...trigramsA.keys()].filter((trigramA) => trigramsB.has(trigramA)).length /
		trigramsA.size
	);
}

const mapUsers = (
	term: string,
	users: Awaited<ReturnType<typeof insertUser>>[],
) =>
	users
		.sort((a, b) => {
			if (term.length < 3) {
				const sortedByName = a.name.localeCompare(b.name);
				if (sortedByName !== 0) {
					return sortedByName;
				}
			} else {
				const similarityA = trigramSimilarity(term, a.name);
				const similarityB = trigramSimilarity(term, b.name);
				if (similarityA !== similarityB) {
					return similarityB - similarityA;
				}
			}
			return a.id.localeCompare(b.id);
		})
		.map(({ id }) => id);

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("users.suggest", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				input: faker.string.alpha(),
				limit: 1,
				direction: "forward",
				cursor: 0,
			}),
		);

		describe("input", () => {
			test("is too long", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: "a".repeat(MAX_SUGGEST_LENGTH + 1),
							limit: 1,
							direction: "forward",
							cursor: 0,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "input": Too big: expected string to have <=255 characters`,
				);
			});
		});

		describe("limit", () => {
			test("is <= 0", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: 0,
							direction: "forward",
							cursor: 0,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too small: expected number to be >0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: MAX_LIMIT + 1,
							direction: "forward",
							cursor: 0,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too big: expected number to be <=100`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: faker.number.float(),
							direction: "forward",
							cursor: 0,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Invalid input: expected int, received number`,
				);
			});
		});

		describe("cursor", () => {
			test("is < 0", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: 1,
							cursor: -1,
							direction: "forward",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Too small: expected number to be >=0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: 1,
							cursor: MAX_OFFSET + 1,
							direction: "forward",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Too big: expected number to be <=10000`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: 1,
							cursor: faker.number.float(),
							direction: "forward",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Invalid input: expected int, received number`,
				);
			});
		});

		describe("filtered ids", () => {
			test("has non-uuid values", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: 1,
							filterIds: [faker.string.alpha()],
							direction: "forward",
							cursor: 0,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "filterIds[0]": Invalid UUID`,
				);
			});
		});

		describe("non-connected receipt id", () => {
			test("has non-uuid value", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							input: faker.string.alpha(),
							limit: 1,
							options: {
								type: "not-connected-receipt",
								receiptId: faker.string.alpha(),
							},
							direction: "forward",
							cursor: 0,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "options.receiptId": Invalid UUID`,
				);
			});
		});

		test("receipt does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			// Verifying adding other receipts don't affect the error
			await insertReceipt(ctx, accountId);
			const nonExistentReceiptId = faker.string.uuid();
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						input: faker.string.alpha(),
						limit: 1,
						options: {
							type: "not-connected-receipt",
							receiptId: nonExistentReceiptId,
						},
						direction: "forward",
						cursor: 0,
					}),
				"NOT_FOUND",
				`Receipt "${nonExistentReceiptId}" does not exist.`,
			);
		});

		test("has no role in a requested receipt", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: receiptId } = await insertReceipt(ctx, otherAccountId);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						input: faker.string.alpha(),
						limit: 1,
						options: {
							type: "not-connected-receipt",
							receiptId,
						},
						direction: "forward",
						cursor: 0,
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
				insertUser(ctx, accountId, {
					name: "Alice from school",
					publicName: faker.person.fullName(),
				}),
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

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				input: "Alice",
				limit: 10,
				direction: "forward",
				cursor: 0,
			});
			expect(result).toStrictEqual<typeof result>({
				items: mapUsers("Alice", matchedUsers),
				cursor: 0,
				count: matchedUsers.length,
			});
		});

		test("returns results with short request", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const matchedUsers = await Promise.all([
				insertUser(ctx, accountId, { name: "Ally" }),
				insertUser(ctx, accountId, {
					name: "Alice",
					publicName: faker.person.fullName(),
				}),
				insertUser(ctx, accountId, { name: "Aliko" }),
			]);
			const result = await caller.procedure({
				input: "Al",
				limit: 10,
				direction: "forward",
				cursor: 0,
			});
			expect(result).toStrictEqual<typeof result>({
				// Shorter requests are sorted by name, not by similarity
				items: mapUsers("Al", matchedUsers),
				cursor: 0,
				count: matchedUsers.length,
			});
		});

		test("returns empty results", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				input: "Alice",
				limit: 10,
				direction: "forward",
				cursor: 0,
			});
			expect(result).toStrictEqual<typeof result>({
				items: [],
				cursor: 0,
				count: 0,
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
				publicName: faker.person.fullName(),
			});
			const matchedUsers = [
				await insertUser(ctx, accountId, { name: "Alice from gym" }),
			];
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

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				input: "Alice",
				limit: 10,
				filterIds: [filteredUserId],
				options: { type: "not-connected-receipt", receiptId },
				direction: "forward",
				cursor: 0,
			});
			expect(result).toStrictEqual<typeof result>({
				items: mapUsers("Alice", matchedUsers),
				cursor: 0,
				count: matchedUsers.length,
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
				insertUser(ctx, accountId, {
					name: "Alice from school",
					publicName: faker.person.fullName(),
				}),
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

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				input: "Alice",
				limit: 10,
				options: { type: "not-connected" },
				direction: "forward",
				cursor: 0,
			});
			expect(result).toStrictEqual<typeof result>({
				items: mapUsers("Alice", matchedUsers),
				cursor: 0,
				count: matchedUsers.length,
			});
		});

		test("returns fuzzily matched users", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const matchedUsers = await Promise.all([
				insertUser(ctx, accountId, { name: "Alice from work" }),
				insertUser(ctx, accountId, {
					name: "Alice from school",
					publicName: faker.person.fullName(),
				}),
				insertUser(ctx, accountId, { name: "Alide - a typo" }),
			]);
			// Too fuzzy - should not be returned
			await insertUser(ctx, accountId, { name: "Alcc - a heavier typo" });

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				input: "Alice",
				limit: 10,
				direction: "forward",
				cursor: 0,
			});
			expect(result).toStrictEqual({
				// Order of matched users is important - they are sorted by fuzziness
				items: matchedUsers.map(({ id }) => id),
				cursor: 0,
				count: matchedUsers.length,
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

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const firstPage = await caller.procedure({
				input: "Alice",
				limit,
				direction: "forward",
				cursor: 0,
			});
			expect(firstPage.items.length).toBe(limit);
			expect(firstPage.cursor).toBe(0);
			expect(firstPage.count).toBe(limit + 1);
			const secondPage = await caller.procedure({
				input: "Alice",
				cursor: firstPage.cursor + limit,
				limit,
				direction: "forward",
			});
			expect(secondPage.items.length).toBeLessThan(limit);
			expect(secondPage.cursor).toBe(limit);
			expect(secondPage.count).toBe(limit + 1);
		});

		test("returns users with given filtered users", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const accounts = [await insertAccount(ctx)] as const;

			const { id: filteredUserId } = await insertUser(ctx, accountId, {
				name: "Alice from work",
			});
			const matchedUsers = await Promise.all([
				insertUser(ctx, accountId, {
					name: "Alice from school",
					publicName: faker.person.fullName(),
				}),
				insertUser(ctx, accountId, { name: "Alice from gym" }),
			]);
			const [connectedMatchedUser] = await insertConnectedUsers(ctx, [
				{ accountId, name: "Connected Alice" },
				accounts[0].id,
			]);
			matchedUsers.push(connectedMatchedUser);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				input: "Alice",
				limit: 10,
				filterIds: [filteredUserId],
				direction: "forward",
				cursor: 0,
			});
			expect(result).toStrictEqual<typeof result>({
				items: mapUsers("Alice", matchedUsers),
				cursor: 0,
				count: matchedUsers.length,
			});
		});

		test("doesn't return self user", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx, {
				user: { name: "Self Alice" },
			});
			const user = await insertUser(ctx, accountId, {
				name: "Alice from work",
			});

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				input: "Alice",
				limit: 10,
				direction: "forward",
				cursor: 0,
			});
			expect(result).toStrictEqual<typeof result>({
				items: [user.id],
				cursor: 0,
				count: 1,
			});
		});

		describe("multiple intentions", () => {
			test("success", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);

				const users = mapUsers(
					"Alice",
					await Promise.all(
						Array.from({ length: 10 }, async (_, index) =>
							insertUser(ctx, accountId, { name: `Alice ${index}` }),
						),
					),
				);

				const limit = 2;
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const commonOptions = {
					input: "Alice",
					limit,
					direction: "forward" as const,
				};
				const results = await runInBand([
					() => caller.procedure({ ...commonOptions, cursor: 0 }),
					() => caller.procedure({ ...commonOptions, cursor: 2 }),
					() => caller.procedure({ ...commonOptions, cursor: 6 }),
				]);
				expect(results).toStrictEqual<typeof results>([
					{
						count: users.length,
						cursor: 0,
						items: users.slice(0, 2),
					},
					{
						count: users.length,
						cursor: 2,
						items: users.slice(2, 4),
					},
					{
						count: users.length,
						cursor: 6,
						items: users.slice(6, 8),
					},
				]);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const user = await insertUser(ctx, accountId, { name: "Alice" });

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const commonOptions = {
					input: "Alice",
					direction: "forward" as const,
					cursor: 0,
				};
				const results = await runInBand([
					() => caller.procedure({ ...commonOptions, limit: 2 }),
					() =>
						caller.procedure({ ...commonOptions, limit: -1 }).catch((e) => e),
				]);
				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					count: 1,
					cursor: 0,
					items: mapUsers("Alice", [user]),
				});
				expect(results[1]).toBeInstanceOf(TRPCError);
			});
		});
	});
});
