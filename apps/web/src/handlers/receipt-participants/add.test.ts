import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertConnectedPeers,
	insertPeer,
	insertReceipt,
	insertReceiptParticipant,
	insertUser,
	insertUserWithSession,
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
				const { sessionId } = await insertUserWithSession(ctx);
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
				const { sessionId } = await insertUserWithSession(ctx);
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
				const { sessionId } = await insertUserWithSession(ctx);
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
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await insertReceipt(ctx, userId);
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

		test("receipt is not owned by an  user", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			await insertReceipt(ctx, userId);

			const { id: foreignUserId } = await insertUser(ctx);
			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
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
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, userId);
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

			test("is not owned by the  user", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, userId);
				const { id: foreignUserId } = await insertUser(ctx);
				const { id: foreignPeerId } = await insertPeer(ctx, foreignUserId);

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
				const { sessionId, userId } = await insertUserWithSession(ctx);
				await insertReceipt(ctx, userId);

				const { id: receiptId } = await insertReceipt(ctx, userId);
				const { id: participantPeerId } = await insertPeer(ctx, userId);
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
					userId,
					peerId: selfPeerId,
				} = await insertUserWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, userId);

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
					userId,
					peerId: selfPeerId,
				} = await insertUserWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, userId);
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
				userId,
				peerId: selfPeerId,
			} = await insertUserWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, userId);
			const { id: anotherReceiptId } = await insertReceipt(ctx, userId);
			const peer = await insertPeer(ctx, userId);
			const { id: foreignUserId } = await insertUser(ctx, {
				avatarUrl: null,
			});
			const [foreignPeer, { id: foreignToSelfPeerId }] =
				await insertConnectedPeers(ctx, [userId, foreignUserId]);

			// Verify unrelated data doesn't affect the result
			const { id: skippedReceiptId } = await insertReceipt(ctx, userId);
			const { id: anotherPeerId } = await insertPeer(ctx, userId);
			await insertReceiptParticipant(ctx, skippedReceiptId, anotherPeerId);

			const { id: foreignReceiptId } = await insertReceipt(ctx, foreignUserId);
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
