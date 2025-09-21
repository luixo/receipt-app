import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { identity } from "remeda";
import { describe, expect } from "vitest";

import type { TRPCQueryInput, TRPCQueryOutput } from "~app/trpc";
import { MAX_LIMIT, MAX_OFFSET } from "~app/utils/validation";
import type { AccountId } from "~db/ids";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertReceipt,
	insertReceiptItem,
	insertReceiptParticipant,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import type { TestContext } from "~tests/backend/utils/test";
import { test } from "~tests/backend/utils/test";
import { compare, parsers } from "~utils/date";
import { t } from "~web/handlers/trpc";
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./get-paged";

type MockReceipt = Awaited<ReturnType<typeof mockData>>["receipts"][number];
const sortReceipts = (receipts: MockReceipt[]) =>
	receipts.sort((a, b) => compare.plainDate(b.issued, a.issued));

const mapReceipt = (receipt: MockReceipt): Output["items"][number] => ({
	id: receipt.id,
	highlights: [],
	matchedItems: [],
});

const createCaller = t.createCallerFactory(t.router({ procedure }));

type Input = TRPCQueryInput<"receipts.getPaged">;
type Output = TRPCQueryOutput<"receipts.getPaged">;

const mockData = async (ctx: TestContext) => {
	const {
		sessionId,
		accountId,
		userId: selfUserId,
	} = await insertAccountWithSession(ctx);
	const foreignAccount = await insertAccount(ctx);

	// Verify other users do not interfere
	await insertReceipt(ctx, foreignAccount.id);

	// Self receipt
	const selfReceipt = await insertReceipt(ctx, accountId, {
		issued: parsers.plainDate("2020-01-06"),
	});
	// Self receipt: participants
	await insertReceiptParticipant(ctx, selfReceipt.id, selfUserId);
	// Self receipt: items
	const selfReceiptItems = await Promise.all([
		insertReceiptItem(ctx, selfReceipt.id),
		insertReceiptItem(ctx, selfReceipt.id),
		insertReceiptItem(ctx, selfReceipt.id),
	]);
	const selfReceiptWithItems = {
		...selfReceipt,
		items: selfReceiptItems,
	};

	// Other self receipt
	const otherSelfReceipt = await insertReceipt(ctx, accountId, {
		issued: parsers.plainDate("2020-02-06"),
	});
	const otherSelfReceiptWithItems = {
		...otherSelfReceipt,
		items: [],
	};
	const user = await insertUser(ctx, accountId);
	// Other self receipt: participants
	await Promise.all([
		insertReceiptParticipant(ctx, otherSelfReceipt.id, selfUserId),
		insertReceiptParticipant(ctx, otherSelfReceipt.id, user.id),
	]);

	// Foreign receipt
	const [foreignToSelfUser] = await insertConnectedUsers(ctx, [
		foreignAccount.id,
		accountId,
	]);
	const foreignReceipt = await insertReceipt(ctx, foreignAccount.id, {
		issued: parsers.plainDate("2020-03-06"),
	});
	// Foreign receipt: participants
	await Promise.all([
		insertReceiptParticipant(ctx, foreignReceipt.id, foreignAccount.userId),
		insertReceiptParticipant(ctx, foreignReceipt.id, foreignToSelfUser.id),
	]);
	// Foreign receipt: items
	const foreignReceiptItems = await Promise.all([
		insertReceiptItem(ctx, foreignReceipt.id),
		insertReceiptItem(ctx, foreignReceipt.id),
		insertReceiptItem(ctx, foreignReceipt.id),
	]);
	const foreignReceiptWithItems = {
		...foreignReceipt,
		items: foreignReceiptItems,
	};

	// Other foreign receipt
	const otherForeignReceipt = await insertReceipt(ctx, foreignAccount.id, {
		issued: parsers.plainDate("2020-04-06"),
		name: "T'zolkin",
	});
	// Other foreign receipt: participants
	await insertReceiptParticipant(
		ctx,
		otherForeignReceipt.id,
		foreignToSelfUser.id,
	);
	// Other foreign receipt: items
	const otherForeignReceiptItems = await Promise.all([
		insertReceiptItem(ctx, otherForeignReceipt.id, { name: "Teotihuacan" }),
		insertReceiptItem(ctx, otherForeignReceipt.id),
		insertReceiptItem(ctx, otherForeignReceipt.id),
	]);
	const otherForeignReceiptWithItems = {
		...otherForeignReceipt,
		items: otherForeignReceiptItems,
	};

	const receipts: (Awaited<ReturnType<typeof insertReceipt>> & {
		items: Awaited<ReturnType<typeof insertReceiptItem>>[];
	})[] = [
		selfReceiptWithItems,
		otherSelfReceiptWithItems,
		foreignReceiptWithItems,
		otherForeignReceiptWithItems,
	];

	return {
		accountId,
		sessionId,
		receipts,
	};
};

const runFunctionalTest = async (
	ctx: TestContext,
	{
		modifyInput = identity(),
		modifyOutput = (receipts) => receipts.map(mapReceipt),
	}: {
		modifyInput?: (input: Input, opts: { receipts: MockReceipt[] }) => Input;
		modifyOutput?: (
			receipts: MockReceipt[],
			opts: { accountId: AccountId },
		) => Output["items"];
	} = {},
) => {
	const { accountId, sessionId, receipts } = await mockData(ctx);

	const limit = 10;
	const caller = createCaller(await createAuthContext(ctx, sessionId));
	const sortedReceipts = sortReceipts(receipts);
	const result = await caller.procedure(
		modifyInput(
			{
				limit,
				cursor: 0,
				orderBy: "date-desc",
			},
			{ receipts: sortedReceipts },
		),
	);
	const output = modifyOutput(sortedReceipts, { accountId });
	expect(output.length).toBeGreaterThan(0);
	expect(result).toStrictEqual<typeof result>({
		count: output.length,
		cursor: 0,
		items: output.slice(0, limit),
	});
};

describe("receipts.getPaged", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				limit: 1,
				cursor: 0,
				orderBy: "date-desc",
			}),
		);

		describe("limit", () => {
			test("is <= 0", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: 0, limit: 0, orderBy: "date-desc" }),
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
							cursor: 0,
							limit: MAX_LIMIT + 1,
							orderBy: "date-desc",
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
							cursor: 0,
							limit: faker.number.float(),
							orderBy: "date-desc",
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
						caller.procedure({ cursor: -1, limit: 1, orderBy: "date-desc" }),
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
							cursor: MAX_OFFSET + 1,
							limit: 1,
							orderBy: "date-desc",
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
							cursor: faker.number.float(),
							limit: 1,
							orderBy: "date-desc",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Invalid input: expected int, received number`,
				);
			});
		});

		describe("orderBy", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							cursor: 0,
							limit: 1,
							orderBy: "invalid" as "date-desc",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "orderBy": Invalid option: expected one of "date-asc"|"date-desc"`,
				);
			});
		});
	});

	describe("functionality", () => {
		test("returns empty results", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const { id: otherAccountId } = await insertAccount(ctx);

			// Verify other receipts do not interfere
			await insertReceipt(ctx, otherAccountId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				limit: 3,
				cursor: 0,
				orderBy: "date-desc",
			});
			expect(result).toStrictEqual<typeof result>({
				count: 0,
				cursor: 0,
				items: [],
			});
		});

		test("returns results", async ({ ctx }) => {
			await runFunctionalTest(ctx);
		});

		test("returns paged results", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			const limit = 2;
			const count = 2 * limit - 1;
			await Promise.all(
				Array.from({ length: limit }, async (_, index) => {
					await insertReceipt(ctx, accountId, { name: `Receipt ${index}` });
					if (index !== 0) {
						await insertReceipt(ctx, accountId, {
							name: `Receipt ${index} - additional`,
						});
					}
				}),
			);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const firstPage = await caller.procedure({
				limit,
				cursor: 0,
				orderBy: "date-desc",
			});
			expect(firstPage.items.length).toBe(limit);
			expect(firstPage.count).toBe(count);
			expect(firstPage.cursor).toBe(0);
			const secondPage = await caller.procedure({
				cursor: firstPage.cursor + limit,
				limit,
				orderBy: "date-desc",
			});
			expect(secondPage.items.length).toBeLessThan(limit);
			expect(secondPage.count).toBe(count);
			expect(secondPage.cursor).toBe(firstPage.cursor + limit);
		});

		test("orderBy - asc", async ({ ctx }) => {
			await runFunctionalTest(ctx, {
				modifyInput: (input) => ({ ...input, orderBy: "date-asc" }),
				modifyOutput: (receipts) =>
					receipts
						.sort((a, b) => compare.plainDate(a.issued, b.issued))
						.map(mapReceipt),
			});
		});

		describe("filters", () => {
			describe("ownage filter", () => {
				describe("owned by me", () => {
					test("true", async ({ ctx }) => {
						await runFunctionalTest(ctx, {
							modifyInput: (input) => ({
								...input,
								filters: { ownedByMe: true },
							}),
							modifyOutput: (receipts, { accountId: selfAccountId }) =>
								receipts
									.filter((receipt) => receipt.ownerAccountId === selfAccountId)
									.map(mapReceipt),
						});
					});

					test("false", async ({ ctx }) => {
						await runFunctionalTest(ctx, {
							modifyInput: (input) => ({
								...input,
								filters: { ownedByMe: false },
							}),
							modifyOutput: (receipts, { accountId: selfAccountId }) =>
								receipts
									.filter((receipt) => receipt.ownerAccountId !== selfAccountId)
									.map(mapReceipt),
						});
					});
				});
			});

			describe("lookup filter", () => {
				describe("name match", () => {
					test("full match", async ({ ctx }) => {
						await runFunctionalTest(ctx, {
							modifyInput: (input, { receipts }) => ({
								...input,
								filters: { query: receipts[0]?.name },
							}),
							modifyOutput: (receipts) =>
								receipts.slice(0, 1).map((receipt) => ({
									id: receipt.id,
									highlights: [[0, receipt.name.length]],
									matchedItems: [],
								})),
						});
					});
					test("partial match", async ({ ctx }) => {
						const partialSliceLength = 5;
						await runFunctionalTest(ctx, {
							modifyInput: (input, { receipts }) => ({
								...input,
								filters: {
									query: receipts[0]?.name.slice(0, partialSliceLength),
								},
							}),
							modifyOutput: (receipts) =>
								receipts.slice(0, 1).map((receipt) => ({
									id: receipt.id,
									highlights: [[0, partialSliceLength]],
									matchedItems: [],
								})),
						});
					});
				});
				describe("item name match", () => {
					test("full match", async ({ ctx }) => {
						await runFunctionalTest(ctx, {
							modifyInput: (input, { receipts }) => ({
								...input,
								filters: { query: receipts[0]?.items[0]?.name },
							}),
							modifyOutput: (receipts) =>
								receipts.slice(0, 1).map((receipt) => {
									const firstItem = receipt.items[0];
									if (!firstItem) {
										throw new Error("Expected to have at least 1 item");
									}
									return {
										id: receipt.id,
										highlights: [],
										matchedItems: [
											{
												id: firstItem.id,
												highlights: [[0, firstItem.name.length]],
											},
										],
									};
								}),
						});
					});
					test("partial match", async ({ ctx }) => {
						const partialSliceLength = 5;
						await runFunctionalTest(ctx, {
							modifyInput: (input, { receipts }) => ({
								...input,
								filters: {
									query: receipts[0]?.items[0]?.name.slice(
										0,
										partialSliceLength,
									),
								},
							}),
							modifyOutput: (receipts) =>
								receipts.slice(0, 1).map((receipt) => {
									const firstItem = receipt.items[0];
									if (!firstItem) {
										throw new Error("Expected to have at least 1 item");
									}
									return {
										id: receipt.id,
										highlights: [],
										matchedItems: [
											{
												id: firstItem.id,
												highlights: [[0, partialSliceLength]],
											},
										],
									};
								}),
						});
					});
				});
			});
		});

		describe("multiple intentions", () => {
			test("success", async ({ ctx }) => {
				const { sessionId, receipts } = await mockData(ctx);

				const descReceipts = sortReceipts(receipts).map(mapReceipt);
				const ascReceipts = receipts.toReversed().map(mapReceipt);

				const limit = 2;
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ limit, cursor: 0, orderBy: "date-desc" }),
					() => caller.procedure({ limit, cursor: 2, orderBy: "date-desc" }),
					() =>
						caller.procedure({
							limit,
							cursor: 2,
							orderBy: "date-asc",
						}),
					() => caller.procedure({ limit, cursor: 6, orderBy: "date-desc" }),
				]);
				expect(results).toStrictEqual<typeof results>([
					{
						count: receipts.length,
						cursor: 0,
						items: descReceipts.slice(0, 2),
					},
					{
						count: receipts.length,
						cursor: 2,
						items: descReceipts.slice(2, 4),
					},
					{
						count: receipts.length,
						cursor: 2,
						items: ascReceipts.slice(2, 4),
					},
					{
						count: receipts.length,
						cursor: 6,
						items: descReceipts.slice(6, 8),
					},
				]);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const { sessionId, receipts } = await mockData(ctx);

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ limit: 2, cursor: 0, orderBy: "date-desc" }),
					() =>
						caller
							.procedure({ limit: -1, cursor: 0, orderBy: "date-desc" })
							.catch((e) => e),
				]);
				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					count: receipts.length,
					cursor: 0,
					items: sortReceipts(receipts).map(mapReceipt).slice(0, 2),
				});
				expect(results[1]).toBeInstanceOf(TRPCError);
			});
		});
	});
});
