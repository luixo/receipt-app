import { faker } from "@faker-js/faker";
import { describe } from "vitest";

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

import { procedure } from "./update";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receiptParticipants.update", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				receiptId: faker.string.uuid(),
				peerId: faker.string.uuid(),
				update: { type: "role", role: "viewer" },
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
							update: { type: "role", role: "viewer" },
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
							update: { type: "role", role: "viewer" },
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "peerId": Invalid UUID`,
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
						update: { type: "role", role: "viewer" },
					}),
				"NOT_FOUND",
				`Receipt "${fakeReceiptId}" does not exist.`,
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
							update: { type: "role", role: "viewer" },
						}),
					"NOT_FOUND",
					`Peer "${fakePeerId}" does not exist.`,
				);
			});

			test("is not participating in the receipt", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				await insertReceipt(ctx, userId);

				const { id: notParticipantPeerId } = await insertPeer(ctx, userId);
				const { id: receiptId } = await insertReceipt(ctx, userId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							peerId: notParticipantPeerId,
							update: { type: "role", role: "viewer" },
						}),
					"CONFLICT",
					`Peer "${notParticipantPeerId}" does not participate in receipt "${receiptId}".`,
				);
			});
		});

		describe("role", () => {
			test("cannot be updated for yourself as an owner", async ({ ctx }) => {
				const {
					sessionId,
					userId,
					peerId: selfPeerId,
				} = await insertUserWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, userId);
				await insertReceiptParticipant(ctx, receiptId, selfPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId,
							peerId: selfPeerId,
							update: { type: "role", role: "viewer" },
						}),
					"BAD_REQUEST",
					`Cannot modify your own receipt role.`,
				);
			});

			test("cannot be updated for anyone if you are not a receipt owner", async ({
				ctx,
			}) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);
				const { id: foreignReceiptId } = await insertReceipt(
					ctx,
					foreignUserId,
				);
				const [{ id: foreignToSelfPeerId }] = await insertConnectedPeers(ctx, [
					foreignUserId,
					userId,
				]);
				await insertReceiptParticipant(
					ctx,
					foreignReceiptId,
					foreignToSelfPeerId,
					{ role: "editor" },
				);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							receiptId: foreignReceiptId,
							peerId: foreignToSelfPeerId,
							update: { type: "role", role: "viewer" },
						}),
					"FORBIDDEN",
					`Only receipt owner can modify peer receipt role.`,
				);
			});
		});
	});

	describe("functionality", () => {
		describe("update role", () => {
			test("for another peer", async ({ ctx }) => {
				const {
					sessionId,
					userId,
					peerId: selfPeerId,
				} = await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);
				const { id: receiptId } = await insertReceipt(ctx, userId);
				const [{ id: foreignPeerId }] = await insertConnectedPeers(ctx, [
					userId,
					foreignUserId,
				]);
				await insertReceiptParticipant(ctx, receiptId, foreignPeerId, {
					role: "editor",
				});

				// Verify unrelated data doesn't affect the result
				await insertReceiptParticipant(ctx, receiptId, selfPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({
						receiptId,
						peerId: foreignPeerId,
						update: { type: "role", role: "viewer" },
					}),
				);
			});
		});
	});
});
