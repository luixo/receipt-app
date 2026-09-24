import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { MAX_LIMIT, MAX_OFFSET } from "~app/utils/validation";
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
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { runInBand } from "~web/handlers/utils.test";

import { procedure } from "./get-by-peer-paged";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receipts.getByPeerPaged", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				peerId: faker.string.uuid(),
				cursor: 0,
				limit: 1,
			}),
		);

		describe("peerId", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: "not-a-valid-uuid",
							cursor: 0,
							limit: 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "peerId": Invalid UUID`,
				);
			});
		});

		describe("limit", () => {
			test("is <= 0", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: faker.string.uuid(),
							cursor: 0,
							limit: 0,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too small: expected number to be >0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: faker.string.uuid(),
							cursor: 0,
							limit: MAX_LIMIT + 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "limit": Too big: expected number to be <=100`,
				);
			});
		});

		describe("cursor", () => {
			test("is negative", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: faker.string.uuid(),
							cursor: -1,
							limit: 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Too small: expected number to be >=0`,
				);
			});

			test("is too big", async ({ ctx }) => {
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							peerId: faker.string.uuid(),
							cursor: MAX_OFFSET + 1,
							limit: 1,
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "cursor": Too big: expected number to be <=10000`,
				);
			});
		});

		test("peer does not exist", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));

			const nonExistentPeerId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({ peerId: nonExistentPeerId, cursor: 0, limit: 10 }),
				"NOT_FOUND",
				`Peer "${nonExistentPeerId}" does not exist.`,
			);
		});

		test("peer is not owned by account", async ({ ctx }) => {
			const {
				sessionId,
				account: { email },
			} = await insertAccountWithSession(ctx);

			// Create a peer owned by a different account
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignAccountId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ peerId: foreignPeerId, cursor: 0, limit: 10 }),
				"FORBIDDEN",
				`Peer "${foreignPeerId}" is not owned by "${email}".`,
			);
		});
	});

	describe("functionality", () => {
		test("empty list", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: otherAccountId } = await insertAccount(ctx);
			const [peer] = await insertConnectedPeers(ctx, [
				accountId,
				otherAccountId,
			]);

			// Verify other accounts' receipts don't affect the result
			const { id: foreignAccountId } = await insertAccount(ctx);
			const foreignReceipt = await insertReceipt(ctx, foreignAccountId);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignAccountId);
			await insertReceiptParticipant(ctx, foreignReceipt.id, foreignPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				peerId: peer.id,
				cursor: 0,
				limit: 10,
			});
			expect(result).toStrictEqual<typeof result>({
				items: [],
				count: 0,
				cursor: 0,
			});
		});

		test("own receipt with peer participant", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: otherAccountId } = await insertAccount(ctx);
			const [peer] = await insertConnectedPeers(ctx, [
				accountId,
				otherAccountId,
			]);
			const { id: otherPeerId } = await insertPeer(ctx, accountId);

			const withPeerReceipt = await insertReceipt(ctx, accountId);
			await insertReceiptParticipant(ctx, withPeerReceipt.id, peer.id);
			const withoutPeerReceipt = await insertReceipt(ctx, accountId);
			await insertReceiptParticipant(ctx, withoutPeerReceipt.id, otherPeerId);
			await insertReceipt(ctx, accountId);

			// Verify unrelated data doesn't affect the result
			const { id: foreignAccountId } = await insertAccount(ctx);
			const foreignReceipt = await insertReceipt(ctx, foreignAccountId);
			const { id: foreignPeerId } = await insertPeer(ctx, foreignAccountId);
			await insertReceiptParticipant(ctx, foreignReceipt.id, foreignPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				peerId: peer.id,
				cursor: 0,
				limit: 10,
			});
			expect(result).toStrictEqual<typeof result>({
				items: [withPeerReceipt.id],
				count: 1,
				cursor: 0,
			});
		});

		test("unconnected peer sees only own receipts", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: peerId } = await insertPeer(ctx, accountId);

			const ownReceipt = await insertReceipt(ctx, accountId);
			await insertReceiptParticipant(ctx, ownReceipt.id, peerId);

			// Foreign receipt the account participates in - not linked to the peer
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [, foreignToSelfPeer] = await insertConnectedPeers(ctx, [
				accountId,
				foreignAccountId,
			]);
			const foreignReceipt = await insertReceipt(ctx, foreignAccountId);
			await insertReceiptParticipant(
				ctx,
				foreignReceipt.id,
				foreignToSelfPeer.id,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				peerId,
				cursor: 0,
				limit: 10,
			});
			expect(result).toStrictEqual<typeof result>({
				items: [ownReceipt.id],
				count: 1,
				cursor: 0,
			});
		});

		test("foreign receipt owned by peer", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: peerAccountId } = await insertAccount(ctx);
			const [peer, peerToSelfPeer] = await insertConnectedPeers(ctx, [
				accountId,
				peerAccountId,
			]);

			const foreignReceipt = await insertReceipt(ctx, peerAccountId);
			await insertReceiptParticipant(ctx, foreignReceipt.id, peerToSelfPeer.id);

			// Foreign receipt owned by peer that I'm not invited to
			await insertReceipt(ctx, peerAccountId);

			// Foreign receipt owned by someone else that I participate in
			const { id: thirdAccountId } = await insertAccount(ctx);
			const [, thirdToSelfPeer] = await insertConnectedPeers(ctx, [
				accountId,
				thirdAccountId,
			]);
			const thirdReceipt = await insertReceipt(ctx, thirdAccountId);
			await insertReceiptParticipant(ctx, thirdReceipt.id, thirdToSelfPeer.id);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				peerId: peer.id,
				cursor: 0,
				limit: 10,
			});
			expect(result).toStrictEqual<typeof result>({
				items: [foreignReceipt.id],
				count: 1,
				cursor: 0,
			});
		});

		test("third-party receipt with both participants", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: peerAccountId } = await insertAccount(ctx);
			const { id: thirdAccountId } = await insertAccount(ctx);
			const [peer] = await insertConnectedPeers(ctx, [
				accountId,
				peerAccountId,
			]);
			const [, thirdToSelfPeer] = await insertConnectedPeers(ctx, [
				accountId,
				thirdAccountId,
			]);
			const [, thirdToPeerPeer] = await insertConnectedPeers(ctx, [
				peerAccountId,
				thirdAccountId,
			]);

			const sharedReceipt = await insertReceipt(ctx, thirdAccountId);
			await insertReceiptParticipant(ctx, sharedReceipt.id, thirdToSelfPeer.id);
			await insertReceiptParticipant(ctx, sharedReceipt.id, thirdToPeerPeer.id);

			// Third-party receipt with only me participating
			const soloReceipt = await insertReceipt(ctx, thirdAccountId);
			await insertReceiptParticipant(ctx, soloReceipt.id, thirdToSelfPeer.id);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({
				peerId: peer.id,
				cursor: 0,
				limit: 10,
			});
			expect(result).toStrictEqual<typeof result>({
				items: [sharedReceipt.id],
				count: 1,
				cursor: 0,
			});
		});

		test("combines all receipt kinds ordered by issued desc", async ({
			ctx,
		}) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: peerAccountId } = await insertAccount(ctx);
			const { id: thirdAccountId } = await insertAccount(ctx);
			const [peer, peerToSelfPeer] = await insertConnectedPeers(ctx, [
				accountId,
				peerAccountId,
			]);
			const [, thirdToSelfPeer] = await insertConnectedPeers(ctx, [
				accountId,
				thirdAccountId,
			]);
			const [, thirdToPeerPeer] = await insertConnectedPeers(ctx, [
				peerAccountId,
				thirdAccountId,
			]);

			const oldOwnReceipt = await insertReceipt(ctx, accountId, {
				issued: Temporal.PlainDate.from("2020-01-01"),
			});
			await insertReceiptParticipant(ctx, oldOwnReceipt.id, peer.id);
			const newForeignReceipt = await insertReceipt(ctx, peerAccountId, {
				issued: Temporal.PlainDate.from("2020-01-03"),
			});
			await insertReceiptParticipant(
				ctx,
				newForeignReceipt.id,
				peerToSelfPeer.id,
			);
			const midThirdPartyReceipt = await insertReceipt(ctx, thirdAccountId, {
				issued: Temporal.PlainDate.from("2020-01-02"),
			});
			await insertReceiptParticipant(
				ctx,
				midThirdPartyReceipt.id,
				thirdToSelfPeer.id,
			);
			await insertReceiptParticipant(
				ctx,
				midThirdPartyReceipt.id,
				thirdToPeerPeer.id,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const firstPage = await caller.procedure({
				peerId: peer.id,
				cursor: 0,
				limit: 2,
			});
			expect(firstPage).toStrictEqual<typeof firstPage>({
				items: [newForeignReceipt.id, midThirdPartyReceipt.id],
				count: 3,
				cursor: 0,
			});
			const secondPage = await caller.procedure({
				peerId: peer.id,
				cursor: 2,
				limit: 2,
			});
			expect(secondPage).toStrictEqual<typeof secondPage>({
				items: [oldOwnReceipt.id],
				count: 3,
				cursor: 2,
			});
		});

		describe("multiple intentions", () => {
			test("success", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: firstPeerAccountId } = await insertAccount(ctx);
				const { id: secondPeerAccountId } = await insertAccount(ctx);
				const [firstPeer] = await insertConnectedPeers(ctx, [
					accountId,
					firstPeerAccountId,
				]);
				const [secondPeer] = await insertConnectedPeers(ctx, [
					accountId,
					secondPeerAccountId,
				]);

				const firstReceipt = await insertReceipt(ctx, accountId);
				await insertReceiptParticipant(ctx, firstReceipt.id, firstPeer.id);
				const secondReceipt = await insertReceipt(ctx, accountId);
				await insertReceiptParticipant(ctx, secondReceipt.id, secondPeer.id);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() =>
						caller.procedure({ peerId: firstPeer.id, cursor: 0, limit: 10 }),
					() =>
						caller.procedure({ peerId: secondPeer.id, cursor: 0, limit: 10 }),
				]);
				expect(results).toStrictEqual<typeof results>([
					{ items: [firstReceipt.id], count: 1, cursor: 0 },
					{ items: [secondReceipt.id], count: 1, cursor: 0 },
				]);
			});

			test("mixed success and fail", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: peerAccountId } = await insertAccount(ctx);
				const [peer] = await insertConnectedPeers(ctx, [
					accountId,
					peerAccountId,
				]);

				const receipt = await insertReceipt(ctx, accountId);
				await insertReceiptParticipant(ctx, receipt.id, peer.id);
				const nonExistingPeerId = faker.string.uuid();

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const results = await runInBand([
					() => caller.procedure({ peerId: peer.id, cursor: 0, limit: 10 }),
					() =>
						caller
							.procedure({ peerId: nonExistingPeerId, cursor: 0, limit: 10 })
							.catch((error) => error),
				]);
				expect(results[0]).toStrictEqual<(typeof results)[0]>({
					items: [receipt.id],
					count: 1,
					cursor: 0,
				});
				expect(results[1]).toBeInstanceOf(Error);
			});
		});
	});
});
