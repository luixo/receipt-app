import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { identity } from "remeda";
import { describe, expect } from "vitest";

import type { TRPCQueryInput } from "~app/trpc";
import type { ReceiptPageEntry } from "~app/trpc-types";
import { MAX_LIMIT, MAX_OFFSET } from "~app/utils/validation";
import type { UserId } from "~db/ids";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertConnectedPeers,
	insertPeer,
	insertReceipt,
	insertReceiptItem,
	insertReceiptParticipant,
	insertUser,
	insertUserWithSession,
} from "~tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import type { TestContext } from "~tests/backend/utils/test";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./get-paged";

type MockReceipt = Awaited<ReturnType<typeof mockData>>["receipts"][number];
const sortReceipts = (receipts: MockReceipt[]) =>
	receipts.toSorted((a, b) => Temporal.PlainDate.compare(b.issued, a.issued));

const mapReceipt = (receipt: MockReceipt): ReceiptPageEntry => ({
	id: receipt.id,
	highlights: [],
	matchedItems: [],
});

const createCaller = t.createCallerFactory(t.router({ procedure }));

type Input = TRPCQueryInput<"receipts.getPaged">;
const mockData = async (ctx: TestContext) => {
	const {
		sessionId,
		userId,
		peerId: selfPeerId,
	} = await insertUserWithSession(ctx);
	const foreignUser = await insertUser(ctx);

	// Verify other peers do not interfere
	await insertReceipt(ctx, foreignUser.id);

	// Self receipt
	const selfReceipt = await insertReceipt(ctx, userId, {
		issued: Temporal.PlainDate.from("2020-01-06"),
	});
	// Self receipt: participants
	await insertReceiptParticipant(ctx, selfReceipt.id, selfPeerId);
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
	const otherSelfReceipt = await insertReceipt(ctx, userId, {
		issued: Temporal.PlainDate.from("2020-02-06"),
	});
	const otherSelfReceiptWithItems = {
		...otherSelfReceipt,
		items: [],
	};
	const peer = await insertPeer(ctx, userId);
	// Other self receipt: participants
	await Promise.all([
		insertReceiptParticipant(ctx, otherSelfReceipt.id, selfPeerId),
		insertReceiptParticipant(ctx, otherSelfReceipt.id, peer.id),
	]);

	// Foreign receipt
	const [foreignToSelfPeer] = await insertConnectedPeers(ctx, [
		foreignUser.id,
		userId,
	]);
	const foreignReceipt = await insertReceipt(ctx, foreignUser.id, {
		issued: Temporal.PlainDate.from("2020-03-06"),
	});
	// Foreign receipt: participants
	await Promise.all([
		insertReceiptParticipant(ctx, foreignReceipt.id, foreignUser.peerId),
		insertReceiptParticipant(ctx, foreignReceipt.id, foreignToSelfPeer.id),
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
	const otherForeignReceipt = await insertReceipt(ctx, foreignUser.id, {
		issued: Temporal.PlainDate.from("2020-04-06"),
		name: "T'zolkin",
	});
	// Other foreign receipt: participants
	await insertReceiptParticipant(
		ctx,
		otherForeignReceipt.id,
		foreignToSelfPeer.id,
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
		userId,
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
			opts: { userId: UserId },
		) => ReceiptPageEntry[];
	} = {},
) => {
	const { userId, sessionId, receipts } = await mockData(ctx);

	const limit = 10;
	const caller = createCaller(createAuthContext(ctx, sessionId));
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
	const output = modifyOutput(sortedReceipts, { userId });
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
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: 0, limit: 0, orderBy: "date-desc" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too small: expected number to be >0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
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
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
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
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({ cursor: -1, limit: 1, orderBy: "date-desc" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Too small: expected number to be >=0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
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
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
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
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
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
			const { sessionId } = await insertUserWithSession(ctx);
			const { id: otherUserId } = await insertUser(ctx);

			// Verify other receipts do not interfere
			await insertReceipt(ctx, otherUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
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
			const { sessionId, userId } = await insertUserWithSession(ctx);

			const limit = 2;
			const count = 2 * limit - 1;
			await Promise.all(
				Array.from({ length: limit }, async (_, index) => {
					await insertReceipt(ctx, userId, { name: `Receipt ${index}` });
					if (index !== 0) {
						await insertReceipt(ctx, userId, {
							name: `Receipt ${index} - additional`,
						});
					}
				}),
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const firstPage = await caller.procedure({
				limit,
				cursor: 0,
				orderBy: "date-desc",
			});
			expect(firstPage.items).toHaveLength(limit);
			expect(firstPage.count).toStrictEqual<(typeof firstPage)["count"]>(count);
			expect(firstPage.cursor).toStrictEqual<(typeof firstPage)["cursor"]>(0);
			const secondPage = await caller.procedure({
				cursor: firstPage.cursor + limit,
				limit,
				orderBy: "date-desc",
			});
			expect(secondPage.items.length).toBeLessThan(limit);
			expect(secondPage.count).toStrictEqual<(typeof secondPage)["count"]>(
				count,
			);
			expect(secondPage.cursor).toStrictEqual(firstPage.cursor + limit);
		});

		test("orderBy - asc", async ({ ctx }) => {
			await runFunctionalTest(ctx, {
				modifyInput: (input) => ({ ...input, orderBy: "date-asc" }),
				modifyOutput: (receipts) =>
					receipts
						.toSorted((a, b) => Temporal.PlainDate.compare(a.issued, b.issued))
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
							modifyOutput: (receipts, { userId: selfUserId }) =>
								receipts
									.filter((receipt) => receipt.ownerUserId === selfUserId)
									.map(mapReceipt),
						});
					});

					test("false", async ({ ctx }) => {
						await runFunctionalTest(ctx, {
							modifyInput: (input) => ({
								...input,
								filters: { ownedByMe: false },
							}),
							modifyOutput: (receipts, { userId: selfUserId }) =>
								receipts
									.filter((receipt) => receipt.ownerUserId !== selfUserId)
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
									const [firstItem] = receipt.items;
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
									const [firstItem] = receipt.items;
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

				const sortedReceipts = sortReceipts(receipts);
				const descReceipts = sortedReceipts.map(mapReceipt);
				const ascReceipts = sortedReceipts.toReversed().map(mapReceipt);

				const limit = 2;
				const caller = createCaller(createAuthContext(ctx, sessionId));
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

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ limit: 2, cursor: 0, orderBy: "date-desc" }),
					() =>
						caller
							.procedure({ limit: -1, cursor: 0, orderBy: "date-desc" })
							.catch((error) => error),
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
