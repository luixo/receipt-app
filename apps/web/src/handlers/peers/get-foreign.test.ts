import { faker } from "@faker-js/faker";
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
				const { sessionId } = await insertAccountWithSession(ctx);
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
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			// Verifying adding other peers doesn't affect the error
			await insertPeer(ctx, accountId);
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

		test("peer is not owned by the account", async ({ ctx }) => {
			// Self account
			const { sessionId } = await insertAccountWithSession(ctx);
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, otherAccountId);
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
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			// Verify other peers do not interfere
			await insertPeer(ctx, accountId);
			const { id: peerId } = await insertPeer(ctx, accountId);
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
			test("peer has an account and public name", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const { id: otherAccountId } = await insertAccount(ctx);
				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));

				// Verify other peers do not interfere
				const { id: otherPeerId } = await insertPeer(ctx, accountId);
				// Verify other receipt participants do not interfere
				await insertReceiptParticipant(ctx, receiptId, otherPeerId);

				const [{ id: foreignPeerId, name, publicName: foreignPublicName }] =
					await insertConnectedPeers(ctx, [
						{
							accountId: foreignAccountId,
							publicName: faker.person.fullName(),
						},
						otherAccountId,
					]);
				const [{ id: foreignSelfPeerId }] = await insertConnectedPeers(ctx, [
					foreignAccountId,
					accountId,
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

			test("peer has no account and public name", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);

				const [{ id: foreignSelfPeerId }] = await insertConnectedPeers(ctx, [
					foreignAccountId,
					accountId,
				]);
				const { id: foreignPeerId, name: foreignPeerName } = await insertPeer(
					ctx,
					foreignAccountId,
				);

				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
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
			test("as a third-party account", async ({ ctx }) => {
				const {
					id: connectedAccountId,
					email: connectedEmail,
					avatarUrl: connectedAvatarUrl,
				} = await insertAccount(ctx);
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);

				const [{ id: localConnectedPeerId, name, publicName }] =
					await insertConnectedPeers(ctx, [
						{ accountId, publicName: faker.person.fullName() },
						connectedAccountId,
					]);
				const [{ id: foreignPeerId }] = await insertConnectedPeers(ctx, [
					foreignAccountId,
					connectedAccountId,
				]);
				const [{ id: foreignSelfPeerId }] = await insertConnectedPeers(ctx, [
					foreignAccountId,
					accountId,
				]);

				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				await insertReceiptParticipant(ctx, receiptId, foreignPeerId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfPeerId);

				// Verify other peers do not interfere
				const { id: otherPeerId } = await insertPeer(ctx, accountId);
				// Verify other receipt participants do not interfere
				await insertReceiptParticipant(ctx, receiptId, otherPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: foreignPeerId });
				expect(result).toStrictEqual<typeof result>({
					id: localConnectedPeerId,
					connectedAccount: {
						id: connectedAccountId,
						email: connectedEmail,
						avatarUrl: connectedAvatarUrl,
					},
					name,
					publicName,
				});
			});

			test("as a self account", async ({ ctx }) => {
				const { sessionId, accountId, peerId, account, name } =
					await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);

				const [{ id: foreignSelfPeerId }] = await insertConnectedPeers(ctx, [
					foreignAccountId,
					accountId,
				]);

				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: foreignSelfPeerId });
				expect(result).toStrictEqual<typeof result>({
					id: peerId,
					connectedAccount: {
						id: accountId,
						email: account.email,
						avatarUrl: account.avatarUrl,
					},
					name,
					publicName: undefined,
				});
			});

			test("as a foreign account", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const {
					id: foreignAccountId,
					email: foreignEmail,
					peerId: foreignAccountPeerId,
				} = await insertAccount(ctx, { avatarUrl: null });

				const [
					{ id: foreignPeerId, name, publicName },
					{ id: foreignSelfPeerId },
				] = await insertConnectedPeers(ctx, [
					{ accountId, publicName: faker.person.fullName() },
					foreignAccountId,
				]);

				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				await insertReceiptParticipant(ctx, receiptId, foreignAccountPeerId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: foreignAccountPeerId });
				expect(result).toStrictEqual<typeof result>({
					id: foreignPeerId,
					connectedAccount: {
						id: foreignAccountId,
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
