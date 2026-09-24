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
				`No peer found by id "${nonExistentPeerId}".`,
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
				`No peer found by id "${foreignPeerId}".`,
			);
		});

		describe("foreign peer is not fetched via connected receipt", () => {
			test("not connected to a local peer", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);
				const { id: otherUserId } = await insertUser(ctx);
				const { id: receiptId } = await insertReceipt(ctx, foreignUserId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const [{ id: foreignPeerId }] = await insertConnectedPeers(ctx, [
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
				await insertReceiptParticipant(ctx, receiptId, foreignPeerId);
				await insertReceiptParticipant(ctx, receiptId, foreignSelfPeerId);

				await expectTRPCError(
					() => caller.procedure({ id: foreignPeerId }),
					"NOT_FOUND",
					`No peer found by id "${foreignPeerId}".`,
				);
			});

			test("connected to a local peer as a self  user", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: foreignUserId } = await insertUser(ctx);

				const [{ id: foreignSelfPeerId }] = await insertConnectedPeers(ctx, [
					foreignUserId,
					userId,
				]);

				const { id: receiptId } = await insertReceipt(ctx, foreignUserId);
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
			test("with public name and connected  user with avatar url", async ({
				ctx,
			}) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const {
					id: foreignUserId,
					email: foreignEmail,
					avatarUrl: foreignAvatarUrl,
				} = await insertUser(ctx);
				// Verify other peers do not interfere
				await insertPeer(ctx, userId);
				const [{ id: peerId, name, publicName }] = await insertConnectedPeers(
					ctx,
					[{ userId, publicName: faker.person.fullName() }, foreignUserId],
				);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: peerId });
				expect(result).toStrictEqual<typeof result>({
					id: peerId,
					connectedUser: {
						id: foreignUserId,
						email: foreignEmail,
						avatarUrl: foreignAvatarUrl,
					},
					name,
					publicName,
				});
			});

			test("with connected  user without avatar url", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				const { id: foreignUserId, email: foreignEmail } = await insertUser(
					ctx,
					{ avatarUrl: null },
				);
				// Verify other peers do not interfere
				await insertPeer(ctx, userId);
				const [{ id: peerId, name }] = await insertConnectedPeers(ctx, [
					userId,
					foreignUserId,
				]);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: peerId });
				expect(result).toStrictEqual<typeof result>({
					id: peerId,
					connectedUser: {
						id: foreignUserId,
						email: foreignEmail,
						avatarUrl: undefined,
					},
					name,
					publicName: undefined,
				});
			});

			test("without public name and email", async ({ ctx }) => {
				const { sessionId, userId } = await insertUserWithSession(ctx);
				// Verify other peers do not interfere
				await insertPeer(ctx, userId);
				const { id: peerId, name } = await insertPeer(ctx, userId);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				const result = await caller.procedure({ id: peerId });
				expect(result).toStrictEqual<typeof result>({
					id: peerId,
					connectedUser: undefined,
					name,
					publicName: undefined,
				});
			});
		});
	});
});
