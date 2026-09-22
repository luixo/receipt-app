import { faker } from "@faker-js/faker";
import { describe } from "vitest";

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
				const { sessionId } = await insertAccountWithSession(ctx);
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
				const { sessionId } = await insertAccountWithSession(ctx);
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
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await insertReceipt(ctx, accountId);
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
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
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
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertReceipt(ctx, accountId);

				const { id: notParticipantPeerId } = await insertPeer(ctx, accountId);
				const { id: receiptId } = await insertReceipt(ctx, accountId);

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
					accountId,
					peerId: selfPeerId,
				} = await insertAccountWithSession(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
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
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const { id: foreignReceiptId } = await insertReceipt(
					ctx,
					foreignAccountId,
				);
				const [{ id: foreignToSelfPeerId }] = await insertConnectedPeers(ctx, [
					foreignAccountId,
					accountId,
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
					accountId,
					peerId: selfPeerId,
				} = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const { id: receiptId } = await insertReceipt(ctx, accountId);
				const [{ id: foreignPeerId }] = await insertConnectedPeers(ctx, [
					accountId,
					foreignAccountId,
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
