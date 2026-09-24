import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertConnectedPeers,
	insertPeer,
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

import { procedure } from "./unlink";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("peers.unlink", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ id: faker.string.uuid() }),
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
				() => caller.procedure({ id: nonExistentPeerId }),
				"NOT_FOUND",
				`No peer found by id "${nonExistentPeerId}".`,
			);
		});

		test("peer is not owned by the  user", async ({ ctx }) => {
			// Self  user
			const {
				sessionId,
				user: { email },
			} = await insertUserWithSession(ctx);
			// Foreign  user
			const { id: otherUserId } = await insertUser(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, otherUserId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: foreignPeerId }),
				"FORBIDDEN",
				`Peer "${foreignPeerId}" is not owned by "${email}".`,
			);
		});

		test("peer is not connected to the  user", async ({ ctx }) => {
			// Self  user
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: otherUserId } = await insertUser(ctx);
			// Connected  user
			await insertConnectedPeers(ctx, [userId, otherUserId]);
			// Not connected  user
			const { id: notConnectedPeerId } = await insertPeer(ctx, userId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: notConnectedPeerId }),
				"NOT_FOUND",
				`Peer "${notConnectedPeerId}" doesn't have  user connected to it.`,
			);
		});
	});

	describe("functionality", () => {
		test("user is unlinked from a peer", async ({ ctx }) => {
			// Self  user
			const { sessionId, userId } = await insertUserWithSession(ctx);
			const { id: otherUserId } = await insertUser(ctx);
			// Connected  user
			const [{ id: connectedPeerId }] = await insertConnectedPeers(ctx, [
				userId,
				otherUserId,
			]);
			// Verify other peers are not affected
			await insertPeer(ctx, userId);
			await insertPeer(ctx, otherUserId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: connectedPeerId }),
			);
		});
	});
});
