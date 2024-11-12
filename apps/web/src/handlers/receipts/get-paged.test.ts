import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import type { TRPCQueryInput } from "~app/trpc";
import { MAX_LIMIT, MAX_OFFSET } from "~app/utils/validation";
import type { AccountsId } from "~db/models";
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
import { t } from "~web/handlers/trpc";

import { procedure } from "./get-paged";

const createCaller = t.createCallerFactory(t.router({ procedure }));

type Input = TRPCQueryInput<"receipts.getPaged">;

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
		issued: new Date("2020-01-06"),
	});
	// Self receipt: participants
	await Promise.all([
		insertReceiptParticipant(ctx, selfReceipt.id, selfUserId),
	]);
	// Self receipt: items
	await Promise.all([
		insertReceiptItem(ctx, selfReceipt.id),
		insertReceiptItem(ctx, selfReceipt.id),
		insertReceiptItem(ctx, selfReceipt.id),
	]);

	// Other self receipt
	const otherSelfReceipt = await insertReceipt(ctx, accountId, {
		issued: new Date("2020-02-06"),
	});
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
		issued: new Date("2020-03-06"),
	});
	// Foreign receipt: participants
	await Promise.all([
		insertReceiptParticipant(ctx, foreignReceipt.id, foreignAccount.userId),
		insertReceiptParticipant(ctx, foreignReceipt.id, foreignToSelfUser.id),
	]);
	// Foreign receipt: items
	await Promise.all([
		insertReceiptItem(ctx, foreignReceipt.id),
		insertReceiptItem(ctx, foreignReceipt.id),
		insertReceiptItem(ctx, foreignReceipt.id),
	]);

	// Other foreign receipt
	const otherForeignReceipt = await insertReceipt(ctx, foreignAccount.id, {
		issued: new Date("2020-04-06"),
	});
	// Other foreign receipt: participants
	await Promise.all([
		insertReceiptParticipant(ctx, otherForeignReceipt.id, foreignToSelfUser.id),
	]);
	// Other foreign receipt: items
	await Promise.all([
		insertReceiptItem(ctx, otherForeignReceipt.id),
		insertReceiptItem(ctx, otherForeignReceipt.id),
		insertReceiptItem(ctx, otherForeignReceipt.id),
	]);

	const receipts: Awaited<ReturnType<typeof insertReceipt>>[] = [
		selfReceipt,
		otherSelfReceipt,
		foreignReceipt,
		otherForeignReceipt,
	];

	return {
		accountId,
		sessionId,
		receipts: receipts.map((receipt) => ({
			id: receipt.id,
			name: receipt.name,
			ownerAccountId: receipt.ownerAccountId,
			issued: receipt.issued,
		})),
	};
};

type MockReceipt = Awaited<ReturnType<typeof mockData>>["receipts"][number];
const runFunctionalTest = async (
	ctx: TestContext,
	modifyInput: (input: Input) => Input,
	modifyItems: (items: MockReceipt[], accountId: AccountsId) => MockReceipt[],
) => {
	const { accountId, sessionId, receipts } = await mockData(ctx);

	const limit = 10;
	const caller = createCaller(createAuthContext(ctx, sessionId));
	const result = await caller.procedure(
		modifyInput({
			limit,
			cursor: 0,
			orderBy: "date-desc",
		}),
	);
	const items = modifyItems(
		receipts.sort((a, b) => b.issued.valueOf() - a.issued.valueOf()),
		accountId,
	).map(({ id }) => id);
	expect(items.length).toBeGreaterThan(0);
	expect(result).toStrictEqual<typeof result>({
		count: items.length,
		cursor: 0,
		hasMore: items.length > limit,
		items: items.slice(0, limit),
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
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: 0, limit: 0, orderBy: "date-desc" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Number must be greater than 0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							cursor: 0,
							limit: MAX_LIMIT + 1,
							orderBy: "date-desc",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Number must be less than or equal to 100`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							cursor: 0,
							limit: faker.number.float(),
							orderBy: "date-desc",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Expected integer, received float`,
				);
			});
		});

		describe("cursor", () => {
			test("is < 0", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({ cursor: -1, limit: 1, orderBy: "date-desc" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Number must be greater than or equal to 0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							cursor: MAX_OFFSET + 1,
							limit: 1,
							orderBy: "date-desc",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Number must be less than or equal to 10000`,
				);
			});

			test("is fractional", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							cursor: faker.number.float(),
							limit: 1,
							orderBy: "date-desc",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Expected integer, received float`,
				);
			});
		});

		describe("orderBy", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							cursor: 0,
							limit: 1,
							orderBy: "invalid" as "date-desc",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "orderBy": Invalid input`,
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

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				limit: 3,
				cursor: 0,
				orderBy: "date-desc",
			});
			expect(result).toStrictEqual<typeof result>({
				count: 0,
				cursor: 0,
				hasMore: false,
				items: [],
			});
		});

		test("returns results", async ({ ctx }) => {
			await runFunctionalTest(
				ctx,
				(input) => input,
				(items) => items,
			);
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

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const firstPage = await caller.procedure({
				limit,
				cursor: 0,
				orderBy: "date-desc",
			});
			expect(firstPage.items.length).toBe(limit);
			expect(firstPage.hasMore).toBe(true);
			expect(firstPage.count).toBe(count);
			expect(firstPage.cursor).toBe(0);
			const secondPage = await caller.procedure({
				cursor: firstPage.cursor + limit,
				limit,
				orderBy: "date-desc",
			});
			expect(secondPage.items.length).toBeLessThan(limit);
			expect(secondPage.hasMore).toBe(false);
			expect(secondPage.count).toBe(count);
			expect(secondPage.cursor).toBe(firstPage.cursor + limit);
		});

		test("orderBy - asc", async ({ ctx }) => {
			await runFunctionalTest(
				ctx,
				(input) => ({ ...input, orderBy: "date-asc" }),
				(receipts) =>
					receipts.sort((a, b) => a.issued.valueOf() - b.issued.valueOf()),
			);
		});

		describe("filters", () => {
			describe("owned by me", () => {
				test("true", async ({ ctx }) => {
					await runFunctionalTest(
						ctx,
						(input) => ({ ...input, filters: { ownedByMe: true } }),
						(receipts, selfAccountId) =>
							receipts.filter(
								(receipt) => receipt.ownerAccountId === selfAccountId,
							),
					);
				});

				test("false", async ({ ctx }) => {
					await runFunctionalTest(
						ctx,
						(input) => ({ ...input, filters: { ownedByMe: false } }),
						(receipts, selfAccountId) =>
							receipts.filter(
								(receipt) => receipt.ownerAccountId !== selfAccountId,
							),
					);
				});
			});
		});
	});
});
