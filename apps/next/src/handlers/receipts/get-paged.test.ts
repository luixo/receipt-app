import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertReceipt,
	insertReceiptItem,
	insertReceiptParticipant,
	insertUser,
} from "@tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import type { TestContext } from "@tests/backend/utils/test";
import { test } from "@tests/backend/utils/test";
import type { TRPCQueryInput, TRPCQueryOutput } from "app/trpc";
import { MAX_LIMIT, MAX_OFFSET } from "app/utils/validation";
import type { UsersId } from "next-app/db/models";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./get-paged";
import { getSum } from "./utils.test";

const router = t.router({ procedure });

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

	// Self receipts
	const selfReceipt = await insertReceipt(ctx, accountId, {
		lockedTimestamp: new Date(),
		issued: new Date("2020-01-06"),
	});
	const selfReceiptParticipants = await Promise.all([
		insertReceiptParticipant(ctx, selfReceipt.id, selfUserId, {
			resolved: true,
		}),
	]);
	const selfReceiptItems = await Promise.all([
		insertReceiptItem(ctx, selfReceipt.id),
		insertReceiptItem(ctx, selfReceipt.id),
		insertReceiptItem(ctx, selfReceipt.id),
	]);
	const otherSelfReceipt = await insertReceipt(ctx, accountId, {
		issued: new Date("2020-02-06"),
	});
	const user = await insertUser(ctx, accountId);
	const otherSelfReceiptParticipants = await Promise.all([
		insertReceiptParticipant(ctx, otherSelfReceipt.id, selfUserId),
		insertReceiptParticipant(ctx, otherSelfReceipt.id, user.id, {
			resolved: true,
		}),
	]);
	const selfTransferReceipt = await insertReceipt(ctx, accountId, {
		transferIntentionAccountId: foreignAccount.id,
	});
	// Foreign receipts
	const [foreignToSelfUser, selfToForeignUser] = await insertConnectedUsers(
		ctx,
		[foreignAccount.id, accountId],
	);
	const foreignReceipt = await insertReceipt(ctx, foreignAccount.id, {
		issued: new Date("2020-03-06"),
	});
	const foreignReceiptParticipants = await Promise.all([
		insertReceiptParticipant(ctx, foreignReceipt.id, foreignAccount.userId),
		insertReceiptParticipant(ctx, foreignReceipt.id, foreignToSelfUser.id),
	]);
	const foreignReceiptItems = await Promise.all([
		insertReceiptItem(ctx, foreignReceipt.id),
		insertReceiptItem(ctx, foreignReceipt.id),
		insertReceiptItem(ctx, foreignReceipt.id),
	]);
	const otherForeignReceipt = await insertReceipt(ctx, foreignAccount.id, {
		issued: new Date("2020-04-06"),
	});
	const otherForeignReceiptParticipants = await Promise.all([
		insertReceiptParticipant(ctx, otherForeignReceipt.id, foreignToSelfUser.id),
	]);
	const otherForeignReceiptItems = await Promise.all([
		insertReceiptItem(ctx, otherForeignReceipt.id),
		insertReceiptItem(ctx, otherForeignReceipt.id),
		insertReceiptItem(ctx, otherForeignReceipt.id),
	]);

	const receipts: [
		[Awaited<ReturnType<typeof insertReceipt>>, UsersId],
		Awaited<ReturnType<typeof insertReceiptParticipant>>[],
		Awaited<ReturnType<typeof insertReceiptItem>>[],
	][] = [
		[[selfReceipt, selfUserId], selfReceiptParticipants, selfReceiptItems],
		[[otherSelfReceipt, selfUserId], otherSelfReceiptParticipants, []],
		[
			[foreignReceipt, foreignToSelfUser.id],
			foreignReceiptParticipants,
			foreignReceiptItems,
		],
		[
			[otherForeignReceipt, foreignToSelfUser.id],
			otherForeignReceiptParticipants,
			otherForeignReceiptItems,
		],
		[[selfTransferReceipt, selfUserId], [], []],
	];

	const users: [
		Awaited<ReturnType<typeof insertUser>>,
		Awaited<ReturnType<typeof insertAccount>> | undefined,
	][] = [
		[user, undefined],
		[selfToForeignUser, foreignAccount],
	];

	return {
		sessionId,
		receipts: receipts.map(
			([[receipt, selfReceiptUserId], participants, items]) => ({
				id: receipt.id,
				name: receipt.name,
				role: receipt.ownerAccountId === accountId ? "owner" : "viewer",
				currencyCode: receipt.currencyCode,
				issued: receipt.issued,
				remoteUserId: selfReceiptUserId,
				participantResolved:
					participants.find(
						(participant) => participant.userId === selfReceiptUserId,
					)?.resolved ?? null,
				sum: getSum(items),
				lockedTimestamp: receipt.lockedTimestamp ?? undefined,
				transferIntentionUserId: receipt.transferIntentionAccountId
					? users.find(
							([, account]) =>
								account && account.id === receipt.transferIntentionAccountId,
					  )?.[0].id
					: undefined,
			}),
		),
	};
};

const runFunctionalTest = async (
	ctx: TestContext,
	modifyInput: (input: Input) => Input,
	modifyItems: (items: Output["items"]) => Output["items"],
) => {
	const { sessionId, receipts } = await mockData(ctx);

	const limit = 10;
	const caller = router.createCaller(createAuthContext(ctx, sessionId));
	const result = await caller.procedure(
		modifyInput({
			limit,
			cursor: 0,
			orderBy: "date-desc",
		}),
	);
	const items = modifyItems(
		receipts.sort((a, b) => b.issued.valueOf() - a.issued.valueOf()),
	);
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
			router.createCaller(context).procedure({
				limit: 1,
				cursor: 0,
				orderBy: "date-desc",
			}),
		);

		describe("limit", () => {
			test("is <= 0", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ cursor: 0, limit: 0, orderBy: "date-desc" }),
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
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
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
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({ cursor: -1, limit: 1, orderBy: "date-desc" }),
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
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
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
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
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

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
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

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
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
				(items) =>
					items.sort((a, b) => a.issued.valueOf() - b.issued.valueOf()),
			);
		});

		describe("filters", () => {
			describe("resolved by me", () => {
				test("true", async ({ ctx }) => {
					await runFunctionalTest(
						ctx,
						(input) => ({ ...input, filters: { resolvedByMe: true } }),
						(items) => items.filter((receipt) => receipt.participantResolved),
					);
				});

				test("false", async ({ ctx }) => {
					await runFunctionalTest(
						ctx,
						(input) => ({ ...input, filters: { resolvedByMe: false } }),
						(items) => items.filter((receipt) => !receipt.participantResolved),
					);
				});
			});

			describe("owned by me", () => {
				test("true", async ({ ctx }) => {
					await runFunctionalTest(
						ctx,
						(input) => ({ ...input, filters: { ownedByMe: true } }),
						(items) => items.filter((receipt) => receipt.role === "owner"),
					);
				});

				test("false", async ({ ctx }) => {
					await runFunctionalTest(
						ctx,
						(input) => ({ ...input, filters: { ownedByMe: false } }),
						(items) => items.filter((receipt) => receipt.role !== "owner"),
					);
				});
			});

			describe("locked", () => {
				test("true", async ({ ctx }) => {
					await runFunctionalTest(
						ctx,
						(input) => ({ ...input, filters: { locked: true } }),
						(items) => items.filter((receipt) => receipt.lockedTimestamp),
					);
				});

				test("false", async ({ ctx }) => {
					await runFunctionalTest(
						ctx,
						(input) => ({ ...input, filters: { locked: false } }),
						(items) => items.filter((receipt) => !receipt.lockedTimestamp),
					);
				});
			});

			test("all", async ({ ctx }) => {
				await runFunctionalTest(
					ctx,
					(input) => ({
						...input,
						filters: { resolvedByMe: true, locked: true, ownedByMe: true },
					}),
					(items) =>
						items.filter(
							(receipt) =>
								receipt.participantResolved &&
								receipt.lockedTimestamp &&
								receipt.role === "owner",
						),
				);
			});
		});
	});
});
