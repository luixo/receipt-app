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

import { procedure } from "./get";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("peers.get", () => {
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
				`No peer found by id "${nonExistentPeerId}".`,
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
				`No peer found by id "${foreignPeerId}".`,
			);
		});

		describe("foreign peer is not fetched via connected receipt", () => {
			test("not connected to a local peer", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);
				const { id: otherAccountId } = await insertAccount(ctx);
				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const [{ id: foreignPeerId }] = await insertConnectedPeers(ctx, [
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
				await insertReceiptParticipant(ctx, receiptId, foreignPeerId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfPeerId);

				await expectTRPCError(
					() => caller.procedure({ id: foreignPeerId }),
					"NOT_FOUND",
					`No peer found by id "${foreignPeerId}".`,
				);
			});

			test("connected to a local peer as a self account", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId } = await insertAccount(ctx);

				const [{ id: foreignSelfPeerId }] = await insertConnectedPeers(ctx, [
					foreignAccountId,
					accountId,
				]);

				const { id: receiptId } = await insertReceipt(ctx, foreignAccountId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfPeerId);

				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectTRPCError(
					() => caller.procedure({ id: foreignSelfPeerId }),
					"NOT_FOUND",
					`No peer found by id "${foreignSelfPeerId}".`,
				);
			});
		});
	});

	describe("functionality", () => {
		describe("own peer", () => {
			test("with public name and connected account with avatar url", async ({
				ctx,
			}) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const {
					id: foreignAccountId,
					email: foreignEmail,
					avatarUrl: foreignAvatarUrl,
				} = await insertAccount(ctx);
				// Verify other peers do not interfere
				await insertPeer(ctx, accountId);
				const [{ id: peerId, name, publicName }] = await insertConnectedPeers(
					ctx,
					[
						{ accountId, publicName: faker.person.fullName() },
						foreignAccountId,
					],
				);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: peerId });
				expect(result).toStrictEqual<typeof result>({
					id: peerId,
					connectedAccount: {
						id: foreignAccountId,
						email: foreignEmail,
						avatarUrl: foreignAvatarUrl,
					},
					name,
					publicName,
				});
			});

			test("with connected account without avatar url", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				const { id: foreignAccountId, email: foreignEmail } =
					await insertAccount(ctx, { avatarUrl: null });
				// Verify other peers do not interfere
				await insertPeer(ctx, accountId);
				const [{ id: peerId, name }] = await insertConnectedPeers(ctx, [
					accountId,
					foreignAccountId,
				]);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: peerId });
				expect(result).toStrictEqual<typeof result>({
					id: peerId,
					connectedAccount: {
						id: foreignAccountId,
						email: foreignEmail,
						avatarUrl: undefined,
					},
					name,
					publicName: undefined,
				});
			});

			test("without public name and email", async ({ ctx }) => {
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				// Verify other peers do not interfere
				await insertPeer(ctx, accountId);
				const { id: peerId, name } = await insertPeer(ctx, accountId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: peerId });
				expect(result).toStrictEqual<typeof result>({
					id: peerId,
					connectedAccount: undefined,
					name,
					publicName: undefined,
				});
			});
		});
	});
});
