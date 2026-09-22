import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedPeers,
	insertPeer,
	insertReceipt,
	insertReceiptParticipant,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./add";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receiptParticipants.add", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				receiptId: faker.string.uuid(),
				peerId: faker.string.uuid(),
				role: "editor",
			}),
		);

		describe("receiptId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId: "not-a-uuid",
							peerId: faker.string.uuid(),
							role: "editor",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "receiptId": Invalid UUID`,
				);
			});
		});

		describe("peerId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId: faker.string.uuid(),
							peerId: "not-a-uuid",
							role: "editor",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "peerId": Invalid UUID`,
				);
			});
		});

		describe("role", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId: faker.string.uuid(),
							peerId: faker.string.uuid(),
							role: "foo" as "editor",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "role": Invalid option: expected one of "viewer"|"editor"`,
				);
			});
		});

		test("receipt does not exist", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await insertReceipt(ctx, accountId);
			const fakeReceiptId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						receiptId: fakeReceiptId,
						peerId: faker.string.uuid(),
						role: "editor",
					}),
				"NOT_FOUND",
				`Receipt "${fakeReceiptId}" does not exist.`,
			);
		});

		test("receipt is not owned by an account", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			await insertReceipt(ctx, accountId);

			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			const fakePeerId = faker.string.uuid();

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						receiptId: foreignReceiptId,
						peerId: fakePeerId,
						role: "editor",
					}),
				"FORBIDDEN",
				`Not enough rights to add participant "${fakePeerId}" to receipt "${foreignReceiptId}".`,
			);
		});

		describe("peer", () => {
			test("does not exist", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const fakePeerId = faker.string.uuid();

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							peerId: fakePeerId,
							role: "editor",
						}),
					"NOT_FOUND",
					`Peer "${fakePeerId}" does not exist or is not owned by you.`,
				);
			});

			test("is not owned by the account", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const { id: foreignPeerId } = await insertPeer(ctx, foreignAccountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							peerId: foreignPeerId,
							role: "editor",
						}),
					"NOT_FOUND",
					`Peer "${foreignPeerId}" does not exist or is not owned by you.`,
				);
			});

			test("is already added to the receipt", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertReceipt(ctx, accountId);

				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const { id: participantPeerId } = await insertPeer(ctx, accountId);
				await insertReceiptParticipant(ctx, receiptId, participantPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							peerId: participantPeerId,
							role: "editor",
						}),
					"CONFLICT",
					`Peer "${participantPeerId}" already participates in receipt "${receiptId}".`,
				);
			});
		});
		describe("multiple participants", () => {
			test("duplicate tuples of peer id and receipt id", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					peerId: selfPeerId,
				} = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						runInBand([
							() =>
								caller.procedure({
									receiptId,
									peerId: selfPeerId,
									role: "editor",
								}),
							() =>
								caller.procedure({
									receiptId,
									peerId: selfPeerId,
									role: "viewer",
								}),
						]),
					"CONFLICT",
					`Expected to have unique pair of peer id and receipt id, got repeating pairs: receipt "${receiptId}" / peer "${selfPeerId}" (2 times).`,
				);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const {
					sessionId,
					accountId,
					peerId: selfPeerId,
				} = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const fakePeerId = faker.string.uuid();

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await expectDatabaseDiffSnapshot(ctx, () =>
					runInBand([
						() =>
							caller.procedure({
								receiptId,
								peerId: selfPeerId,
								role: "editor",
							}),
						() =>
							caller
								.procedure({
									receiptId,
									peerId: fakePeerId,
									role: "editor",
								})
								.catch((error) => error),
					]),
				);

				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					createdAt: Temporal.Now.zonedDateTimeISO(),
				});
				expect(results[1]).toBeInstanceOf(TRPCError);
			});
		});
	});

	describe("functionality", () => {
		test("participants are added", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				peerId: selfPeerId,
			} = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, accountId);
			const { id: anotherReceiptId } = await insertReceipt(ctx, accountId);
			const peer = await insertPeer(ctx, accountId);
			const { id: foreignAccountId } = await insertAccount(ctx, {
				avatarUrl: null,
			});
			const [foreignPeer, { id: foreignToSelfPeerId }] =
				await insertConnectedPeers(ctx, [accountId, foreignAccountId]);

			// Verify unrelated data doesn't affect the result
			const { id: skippedReceiptId } = await insertReceipt(ctx, accountId);
			const { id: anotherPeerId } = await insertPeer(ctx, accountId);
			await insertReceiptParticipant(ctx, skippedReceiptId, anotherPeerId);

			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertReceiptParticipant(
				ctx,
				foreignReceiptId,
				foreignToSelfPeerId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				runInBand([
					() =>
						caller.procedure({
							receiptId,
							peerId: selfPeerId,
							role: "editor",
						}),
					() =>
						caller.procedure({ receiptId, peerId: peer.id, role: "editor" }),
					() =>
						caller.procedure({
							receiptId,
							peerId: foreignPeer.id,
							role: "editor",
						}),
					() =>
						caller.procedure({
							receiptId: anotherReceiptId,
							peerId: selfPeerId,
							role: "viewer",
						}),
					() =>
						caller.procedure({
							receiptId: anotherReceiptId,
							peerId: peer.id,
							role: "viewer",
						}),
				]),
			);
			expect(result).toStrictEqual<typeof result>([
				{ createdAt: Temporal.Now.zonedDateTimeISO() },
				{ createdAt: Temporal.Now.zonedDateTimeISO() },
				{ createdAt: Temporal.Now.zonedDateTimeISO() },
				{ createdAt: Temporal.Now.zonedDateTimeISO() },
				{ createdAt: Temporal.Now.zonedDateTimeISO() },
			]);
		});
	});
});
