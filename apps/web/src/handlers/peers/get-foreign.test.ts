import { faker } from "@faker-js/faker";
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
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get-foreign";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("peers.getForeign", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				id: faker.string.uuid(),
			}),
		);

		describe("id", () => {
			test("invalid", async ({ ctx }) => {
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() =>
						caller.procedure({
							id: "not-a-valid-uuid",
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "id": Invalid UUID`,
				);
			});
		});

		test("peer not found", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			// Verifying adding other peers doesn't affect the error
			await insertPeer(ctx, userId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const nonExistentPeerId = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						id: nonExistentPeerId,
					}),
				"NOT_FOUND",
				`No peer found by id "${nonExistentPeerId}" or you don't have access to it.`,
			);
		});

		test("peer is not owned by the  user", async ({ ctx }) => {
			// Self  user
			const { sessionId } = await insertUserWithSession(ctx);
			// Foreign  user
			const { id: otherUserId } = await insertUser(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, otherUserId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() =>
					caller.procedure({
						id: foreignPeerId,
					}),
				"NOT_FOUND",
				`No peer found by id "${foreignPeerId}" or you don't have access to it.`,
			);
		});

		test("peer is our own peer", async ({ ctx }) => {
			const { sessionId, userId } = await insertUserWithSession(ctx);
			// Verify other peers do not interfere
			await insertPeer(ctx, userId);
			const { id: peerId } = await insertPeer(ctx, userId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: peerId }),
				"NOT_FOUND",
				`No peer found by id "${peerId}" or you don't have access to it.`,
			);
		});
	});

	describe("functionality", () => {
		describe("peer is not connected to a local peer", () => {
			test("peer has an  user and public name", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);
				const { id: otherUserId } = await insertUser(ctx);
				const { id: receiptId } = await insertReceipt(ctx, foreignUserId);
				const caller = createCaller(createAuthContext(ctx, sessionId));

				// Verify other peers do not interfere
				const { id: otherPeerId } = await insertPeer(ctx, userId);
				// Verify other receipt participants do not interfere
				await insertReceiptParticipant(ctx, receiptId, otherPeerId);

				const [{ id: foreignPeerId, name, publicName: foreignPublicName }] =
					await insertConnectedPeers(ctx, [
						{
							userId: foreignUserId,
							publicName: faker.person.fullName(),
						},
						otherUserId,
					]);
				const [{ id: foreignSelfPeerId }] = await insertConnectedPeers(ctx, [
					foreignUserId,
					userId,
				]);

				// Adding a foreign peer into the receipt
				await insertReceiptParticipant(ctx, receiptId, foreignPeerId);
				// Verify that we cannot access a peer before we are added into the receipt
				await expectTRPCError(
					() => caller.procedure({ id: foreignPeerId }),
					"NOT_FOUND",
					`No peer found by id "${foreignPeerId}" or you don't have access to it.`,
				);

				// Adding ourselves into the receipt
				await insertReceiptParticipant(ctx, receiptId, foreignSelfPeerId);

				const result = await caller.procedure({
					id: foreignPeerId,
				});
				expect(result).toStrictEqual<typeof result>({
					remoteId: foreignPeerId,
					name: foreignPublicName || name,
				});
			});

			test("peer has no  user and public name", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);

				const [{ id: foreignSelfPeerId }] = await insertConnectedPeers(ctx, [
					foreignUserId,
					userId,
				]);
				const { id: foreignPeerId, name: foreignPeerName } = await insertPeer(
					ctx,
					foreignUserId,
				);

				const { id: receiptId } = await insertReceipt(ctx, foreignUserId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfPeerId);
				await insertReceiptParticipant(ctx, receiptId, foreignPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));

				const result = await caller.procedure({
					id: foreignPeerId,
				});
				expect(result).toStrictEqual<typeof result>({
					remoteId: foreignPeerId,
					name: foreignPeerName,
				});
			});
		});

		describe("connected to a local peer", () => {
			test("as a third-party  user", async ({ ctx }) => {
				const {
					id: connectedUserId,
					email: connectedEmail,
					avatarUrl: connectedAvatarUrl,
				} = await insertUser(ctx);
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);

				const [{ id: localConnectedPeerId, name, publicName }] =
					await insertConnectedPeers(ctx, [
						{ userId, publicName: faker.person.fullName() },
						connectedUserId,
					]);
				const [{ id: foreignPeerId }] = await insertConnectedPeers(ctx, [
					foreignUserId,
					connectedUserId,
				]);
				const [{ id: foreignSelfPeerId }] = await insertConnectedPeers(ctx, [
					foreignUserId,
					userId,
				]);

				const { id: receiptId } = await insertReceipt(ctx, foreignUserId);
				await insertReceiptParticipant(ctx, receiptId, foreignPeerId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfPeerId);

				// Verify other peers do not interfere
				const { id: otherPeerId } = await insertPeer(ctx, userId);
				// Verify other receipt participants do not interfere
				await insertReceiptParticipant(ctx, receiptId, otherPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: foreignPeerId });
				expect(result).toStrictEqual<typeof result>({
					id: localConnectedPeerId,
					connectedUser: {
						id: connectedUserId,
						email: connectedEmail,
						avatarUrl: connectedAvatarUrl,
					},
					name,
					publicName,
				});
			});

			test("as a self  user", async ({ ctx }) => {
				const { sessionId, userId, peerId, user, name } =
					await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);

				const [{ id: foreignSelfPeerId }] = await insertConnectedPeers(ctx, [
					foreignUserId,
					userId,
				]);

				const { id: receiptId } = await insertReceipt(ctx, foreignUserId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: foreignSelfPeerId });
				expect(result).toStrictEqual<typeof result>({
					id: peerId,
					connectedUser: {
						id: userId,
						email: user.email,
						avatarUrl: user.avatarUrl,
					},
					name,
					publicName: undefined,
				});
			});

			test("as a foreign  user", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const {
					id: foreignUserId,
					email: foreignEmail,
					peerId: foreignUserPeerId,
				} = await insertUser(ctx, { avatarUrl: null });

				const [
					{ id: foreignPeerId, name, publicName },
					{ id: foreignSelfPeerId },
				] = await insertConnectedPeers(ctx, [
					{ userId, publicName: faker.person.fullName() },
					foreignUserId,
				]);

				const { id: receiptId } = await insertReceipt(ctx, foreignUserId);
				await insertReceiptParticipant(ctx, receiptId, foreignUserPeerId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: foreignUserPeerId });
				expect(result).toStrictEqual<typeof result>({
					id: foreignPeerId,
					connectedUser: {
						id: foreignUserId,
						email: foreignEmail,
						avatarUrl: undefined,
					},
					name,
					publicName,
				});
			});
		});
	});
});
