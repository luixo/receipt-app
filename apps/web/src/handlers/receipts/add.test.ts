import { faker } from "@faker-js/faker";
import { omit } from "remeda";
import { describe, expect } from "vitest";
import type { z } from "zod";

import { MIN_RECEIPT_ITEM_NAME_LENGTH } from "~app/utils/validation";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertPeer,
	insertReceipt,
	insertReceiptItem,
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
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const invalidUuid = "not-a-uuid";
				await expectTRPCError(
					() =>
						caller.procedure({
							...getValidReceipt(),
							participants: [
								{ peerId: faker.string.uuid(), role: "editor" },
								{ peerId: invalidUuid, role: "editor" },
							],
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "participants[1].peerId": Invalid UUID`,
				);
			});
		});

		describe("items", () => {
			test("invalid uuid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
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

		test("peer does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await insertPeer(ctx, accountId);
			const fakePeerId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						...getValidReceipt(),
						participants: [{ peerId: fakePeerId, role: "editor" }],
					}),
				"NOT_FOUND",
				`Peer "${fakePeerId}" does not exist or is not owned by you.`,
			);
		});

		test("peer is not owned by an account", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			await insertPeer(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignAccountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						...getValidReceipt(),
						participants: [{ peerId: foreignPeerId, role: "editor" }],
					}),
				"NOT_FOUND",
				`Peer "${foreignPeerId}" does not exist or is not owned by you.`,
			);
		});

		describe("inner fails", () => {
			test("participants errors", async ({ ctx }) => {
				const { sessionId, peerId: selfPeerId } =
					await insertAccountWithSession(ctx);

				const fakePeerId = faker.string.uuid();
				const anotherFakePeerId = faker.string.uuid();
				const participants: NonNullable<Input["participants"]> = [
					{ peerId: fakePeerId, role: "editor" },
					{ peerId: anotherFakePeerId, role: "editor" },
					{ peerId: selfPeerId, role: "editor" },
				];

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					expectTRPCError(
						() => caller.procedure({ ...getValidReceipt(), participants }),
						"NOT_FOUND",
						`Peer "${fakePeerId}" does not exist or is not owned by you. (+1 errors)`,
					),
				);
			});

			test("payers errors", async ({ ctx }) => {
				const { sessionId, peerId: selfPeerId } =
					await insertAccountWithSession(ctx);

				const fakePeerId = faker.string.uuid();
				const anotherFakePeerId = faker.string.uuid();
				const payers: NonNullable<Input["payers"]> = [
					{ peerId: fakePeerId, part: 1 },
					{ peerId: anotherFakePeerId, part: 1 },
					{ peerId: selfPeerId, part: 1 },
				];

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					expectTRPCError(
						() => caller.procedure({ ...getValidReceipt(), payers }),
						"PRECONDITION_FAILED",
						`Peer "${fakePeerId}" doesn't participate in receipt "new receipt". (+2 errors)`,
					),
				);
			});

			test("parts fail", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					peerId: selfPeerId,
				} = await insertAccountWithSession(ctx);
				const { id: peerId } = await insertPeer(ctx, accountId);

				// Verify unrelated data doesn't affect the result
				await insertPeer(ctx, accountId);
				const { id: foreignAccountId } = await insertAccount(ctx);
				await insertPeer(ctx, foreignAccountId);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				await insertReceiptItem(ctx, receiptId);

				const participants: NonNullable<Input["participants"]> = [
					{ peerId, role: "editor" },
					{ peerId: selfPeerId, role: "editor" },
				];
				const fakePeerIds = participants.map(() => faker.string.uuid());
				const receiptItems: NonNullable<Input["items"]> = [
					getValidReceiptItemNoReceiptId(),
					{
						...getValidReceiptItemNoReceiptId(),
						consumers: participants.map((_participant, index) => ({
							// oxlint-disable-next-line typescript/no-non-null-assertion
							peerId: fakePeerIds[index]!,
							part: index + 1,
						})),
					},
				];

				const caller = createCaller(createAuthContext(ctx, sessionId));
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
							String.raw`Peer "${fakePeerIds[0]}" doesn't participate in receipt "[a-fA-F0-9-]{36}".`,
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
			await insertPeer(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertPeer(ctx, foreignAccountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure(getValidReceipt()),
			);
			expect(result.id).toMatch(UUID_REGEX);
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				createdAt: Temporal.Now.zonedDateTimeISO(),
				participants: [],
				items: [],
				payers: [],
			});
		});

		test("receipt with participants", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				peerId: selfPeerId,
			} = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId);

			// Verify unrelated data doesn't affect the result
			await insertPeer(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertPeer(ctx, foreignAccountId);

			const participants: NonNullable<Input["participants"]> = [
				{ peerId, role: "editor" },
				{ peerId: selfPeerId, role: "editor" },
			];

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ ...getValidReceipt(), participants }),
			);
			expect(result.id).toMatch(UUID_REGEX);
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				createdAt: Temporal.Now.zonedDateTimeISO(),
				participants: participants.map(() => ({
					createdAt: Temporal.Now.zonedDateTimeISO(),
				})),
				items: [],
				payers: [],
			});
		});

		test("receipt with items", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);

			// Verify unrelated data doesn't affect the result
			await insertPeer(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertPeer(ctx, foreignAccountId);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptItem(ctx, receiptId);

			const receiptItems: NonNullable<Input["items"]> = [
				getValidReceiptItemNoReceiptId(),
				getValidReceiptItemNoReceiptId(),
			];

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ ...getValidReceipt(), items: receiptItems }),
			);
			expect(result.id).toMatch(UUID_REGEX);
			for (const item of result.items) {
				expect(item.id).toMatch(UUID_REGEX);
			}
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				createdAt: Temporal.Now.zonedDateTimeISO(),
				participants: [],
				items: receiptItems.map((_item, index) => ({
					// oxlint-disable-next-line typescript/no-non-null-assertion
					id: result.items[index]!.id,
					createdAt: Temporal.Now.zonedDateTimeISO(),
					consumers: undefined,
					payers: undefined,
				})),
				payers: [],
			});
		});

		test("receipt with consumers", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				peerId: selfPeerId,
			} = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId);

			// Verify unrelated data doesn't affect the result
			await insertPeer(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertPeer(ctx, foreignAccountId);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			await insertReceiptItem(ctx, receiptId);

			const participants: NonNullable<Input["participants"]> = [
				{ peerId, role: "editor" },
				{ peerId: selfPeerId, role: "editor" },
			];
			const receiptItems: NonNullable<Input["items"]> = [
				getValidReceiptItemNoReceiptId(),
				{
					...getValidReceiptItemNoReceiptId(),
					consumers: participants.map((participant, index) => ({
						peerId: participant.peerId,
						part: index + 1,
					})),
					payers: participants.map((participant, index) => ({
						peerId: participant.peerId,
						part: index + 2,
					})),
				},
			];

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					...getValidReceipt(),
					items: receiptItems,
					participants,
				}),
			);
			expect(result.id).toMatch(UUID_REGEX);
			for (const item of result.items) {
				expect(item.id).toMatch(UUID_REGEX);
			}
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				createdAt: Temporal.Now.zonedDateTimeISO(),
				participants: participants.map(() => ({
					createdAt: Temporal.Now.zonedDateTimeISO(),
				})),
				items: receiptItems.map((item, index) => ({
					// oxlint-disable-next-line typescript/no-non-null-assertion
					id: result.items[index]!.id,
					createdAt: Temporal.Now.zonedDateTimeISO(),
					consumers: item.consumers?.map((consumer) => ({
						peerId: consumer.peerId,
						createdAt: Temporal.Now.zonedDateTimeISO(),
					})),
					payers: item.payers?.map((payer) => ({
						peerId: payer.peerId,
						createdAt: Temporal.Now.zonedDateTimeISO(),
					})),
				})),
				payers: [],
			});
		});

		test("receipt with payers", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				peerId: selfPeerId,
			} = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId);

			// Verify unrelated data doesn't affect the result
			await insertPeer(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx);
			await insertPeer(ctx, foreignAccountId);

			const payers: NonNullable<Input["payers"]> = [
				{ peerId, part: 1 },
				{ peerId: selfPeerId, part: 22 },
			];

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					...getValidReceipt(),
					participants: payers.map((payer) => ({
						peerId: payer.peerId,
						role: "editor",
					})),
					payers,
				}),
			);
			expect(result.id).toMatch(UUID_REGEX);
			expect(result).toStrictEqual<typeof result>({
				id: result.id,
				createdAt: Temporal.Now.zonedDateTimeISO(),
				participants: payers.map(() => ({
					createdAt: Temporal.Now.zonedDateTimeISO(),
				})),
				items: [],
				payers: payers.map((payer) => ({
					peerId: payer.peerId,
					createdAt: Temporal.Now.zonedDateTimeISO(),
				})),
			});
		});
	});
});
