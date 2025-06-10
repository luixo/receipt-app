import { faker } from "@faker-js/faker";
import { omit } from "remeda";
import { describe, expect } from "vitest";
import type { z } from "zod/v4";

import { MIN_RECEIPT_ITEM_NAME_LENGTH } from "~app/utils/validation";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertReceipt,
	insertReceiptItem,
	insertUser,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { getValidReceiptItem } from "~web/handlers/receipt-items/utils.test";
import { t } from "~web/handlers/trpc";
import { UUID_REGEX } from "~web/handlers/validation";

import type { addReceiptSchema as schema } from "./add";
import { procedure } from "./add";
import {
	getValidReceipt,
	verifyCurrencyCode,
	verifyIssued,
	verifyName,
} from "./utils.test";

type Input = z.infer<typeof schema>;

const getValidReceiptItemNoReceiptId = () =>
	omit(getValidReceiptItem(), ["receiptId"]);

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receipts.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure(getValidReceipt()),
		);

		verifyName(
			(context, name) =>
				createCaller(context).procedure({ ...getValidReceipt(), name }),
			"",
		);

		verifyCurrencyCode(
			(context, currencyCode) =>
				createCaller(context).procedure({ ...getValidReceipt(), currencyCode }),
			"",
		);

		verifyIssued(
			(context, issued) =>
				createCaller(context).procedure({ ...getValidReceipt(), issued }),
			"",
		);

		describe("participants", () => {
			test("invalid uuid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				const invalidUuid = "not-a-uuid";
				await expectTRPCError(
					() =>
						caller.procedure({
							...getValidReceipt(),
							participants: [
								{ userId: faker.string.uuid(), role: "editor" },
								{ userId: invalidUuid, role: "editor" },
							],
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "participants[1].userId": Invalid UUID`,
				);
			});
		});

		describe("items", () => {
			test("invalid uuid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							...getValidReceipt(),
							items: [
								getValidReceiptItemNoReceiptId(),
								{
									...getValidReceiptItemNoReceiptId(),
									name: "a".repeat(MIN_RECEIPT_ITEM_NAME_LENGTH - 1),
								},
							],
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "items[1].name": Minimal length for receipt item name is ${MIN_RECEIPT_ITEM_NAME_LENGTH}`,
				);
			});
		});

		test("user does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await insertUser(ctx, accountId);
			const fakeUserId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						...getValidReceipt(),
						participants: [{ userId: fakeUserId, role: "editor" }],
					}),
				"NOT_FOUND",
				`User "${fakeUserId}" does not exist or is not owned by you.`,
			);
		});

		test("user is not owned by an account", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			await insertUser(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						...getValidReceipt(),
						participants: [{ userId: foreignUserId, role: "editor" }],
					}),
				"NOT_FOUND",
				`User "${foreignUserId}" does not exist or is not owned by you.`,
			);
		});

		describe("inner fails", () => {
			test("participants errors", async ({ ctx }) => {
				const { sessionId, userId: selfUserId } =
					await insertAccountWithSession(ctx);

				const fakeUserId = faker.string.uuid();
				const anotherFakeUserId = faker.string.uuid();
				const participants: NonNullable<Input["participants"]> = [
					{ userId: fakeUserId, role: "editor" },
					{ userId: anotherFakeUserId, role: "editor" },
					{ userId: selfUserId, role: "editor" },
				];

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					expectTRPCError(
						() => caller.procedure({ ...getValidReceipt(), participants }),
						"NOT_FOUND",
						`User "${fakeUserId}" does not exist or is not owned by you. (+1 errors)`,
					),
				);
			});

			test("payers errors", async ({ ctx }) => {
				const { sessionId, userId: selfUserId } =
					await insertAccountWithSession(ctx);

				const fakeUserId = faker.string.uuid();
				const anotherFakeUserId = faker.string.uuid();
				const payers: NonNullable<Input["payers"]> = [
					{ userId: fakeUserId, part: 1 },
					{ userId: anotherFakeUserId, part: 1 },
					{ userId: selfUserId, part: 1 },
				];

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					expectTRPCError(
						() => caller.procedure({ ...getValidReceipt(), payers }),
						"PRECONDITION_FAILED",
						`User "${fakeUserId}" doesn't participate in receipt "new receipt". (+2 errors)`,
					),
				);
			});

			test("parts fail", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					userId: selfUserId,
				} = await insertAccountWithSession(ctx);
				const { id: userId } = await insertUser(ctx, accountId);

				// Verify unrelated data doesn't affect the result
				await insertUser(ctx, accountId);
				const { id: foreignAccountId } = await insertAccount(ctx);
				await insertUser(ctx, foreignAccountId);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				await insertReceiptItem(ctx, receiptId);

				const participants: NonNullable<Input["participants"]> = [
					{ userId, role: "editor" },
					{ userId: selfUserId, role: "editor" },
				];
				const fakeUserIds = participants.map(() => faker.string.uuid());
				const receiptItems: NonNullable<Input["items"]> = [
					getValidReceiptItemNoReceiptId(),
					{
						...getValidReceiptItemNoReceiptId(),
						consumers: participants.map((_participant, index) => ({
							// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
							userId: fakeUserIds[index]!,
							part: index + 1,
						})),
					},
				];

				const caller = createCaller(await createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					expectTRPCError(
						() =>
							caller.procedure({
								...getValidReceipt(),
								items: receiptItems,
								participants,
							}),
						"PRECONDITION_FAILED",
						new RegExp(
							`User "${fakeUserIds[0]}" doesn't participate in receipt "[a-fA-F0-9-]{36}". \\(\\+1 errors\\)`,
						),
					),
				);
			});
		});
	});

	describe("functionality", () => {
		test("empty receipt", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertUser(ctx, foreignAccountId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure(getValidReceipt()),
			);
			expect(result.id).toMatch(UUID_REGEX);
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				createdAt: new Date(),
				participants: [],
				items: [],
				payers: [],
			});
		});

		test("receipt with participants", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertUser(ctx, foreignAccountId);

			const participants: NonNullable<Input["participants"]> = [
				{ userId, role: "editor" },
				{ userId: selfUserId, role: "editor" },
			];

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ ...getValidReceipt(), participants }),
			);
			expect(result.id).toMatch(UUID_REGEX);
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				createdAt: new Date(),
				participants: participants.map(() => ({ createdAt: new Date() })),
				items: [],
				payers: [],
			});
		});

		test("receipt with items", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertUser(ctx, foreignAccountId);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptItem(ctx, receiptId);

			const receiptItems: NonNullable<Input["items"]> = [
				getValidReceiptItemNoReceiptId(),
				getValidReceiptItemNoReceiptId(),
			];

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ ...getValidReceipt(), items: receiptItems }),
			);
			expect(result.id).toMatch(UUID_REGEX);
			result.items.forEach((item) => {
				expect(item.id).toMatch(UUID_REGEX);
			});
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				createdAt: new Date(),
				participants: [],
				items: receiptItems.map((_item, index) => ({
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					id: result.items[index]!.id,
					createdAt: new Date(),
					consumers: undefined,
				})),
				payers: [],
			});
		});

		test("receipt with consumers", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertUser(ctx, foreignAccountId);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptItem(ctx, receiptId);

			const participants: NonNullable<Input["participants"]> = [
				{ userId, role: "editor" },
				{ userId: selfUserId, role: "editor" },
			];
			const receiptItems: NonNullable<Input["items"]> = [
				getValidReceiptItemNoReceiptId(),
				{
					...getValidReceiptItemNoReceiptId(),
					consumers: participants.map((participant, index) => ({
						userId: participant.userId,
						part: index + 1,
					})),
				},
			];

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					...getValidReceipt(),
					items: receiptItems,
					participants,
				}),
			);
			expect(result.id).toMatch(UUID_REGEX);
			result.items.forEach((item) => {
				expect(item.id).toMatch(UUID_REGEX);
			});
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				createdAt: new Date(),
				participants: participants.map(() => ({ createdAt: new Date() })),
				items: receiptItems.map((item, index) => ({
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					id: result.items[index]!.id,
					createdAt: new Date(),
					consumers: item.consumers?.map((consumer) => ({
						userId: consumer.userId,
						createdAt: new Date(),
					})),
				})),
				payers: [],
			});
		});

		test("receipt with payers", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				userId: selfUserId,
			} = await insertAccountWithSession(ctx);
			const { id: userId } = await insertUser(ctx, accountId);

			// Verify unrelated data doesn't affect the result
			await insertUser(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertUser(ctx, foreignAccountId);

			const payers: NonNullable<Input["payers"]> = [
				{ userId, part: 1 },
				{ userId: selfUserId, part: 22 },
			];

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					...getValidReceipt(),
					participants: payers.map((payer) => ({
						userId: payer.userId,
						role: "editor",
					})),
					payers,
				}),
			);
			expect(result.id).toMatch(UUID_REGEX);
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				createdAt: new Date(),
				participants: payers.map(() => ({ createdAt: new Date() })),
				items: [],
				payers: payers.map((payer) => ({
					userId: payer.userId,
					createdAt: new Date(),
				})),
			});
		});
	});
});
