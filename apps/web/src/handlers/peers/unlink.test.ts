import { faker } from "@faker-js/faker";
import { describe } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedPeers,
	insertPeer,
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
				() => caller.procedure({ id: nonExistentPeerId }),
				"NOT_FOUND",
				`No peer found by id "${nonExistentPeerId}".`,
			);
		});

		test("peer is not owned by the account", async ({ ctx }) => {
			// Self account
			const {
				sessionId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			// Foreign account
			const { id: otherAccountId } = await insertAccount(ctx);
			const { id: foreignPeerId } = await insertPeer(ctx, otherAccountId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: foreignPeerId }),
				"FORBIDDEN",
				`Peer "${foreignPeerId}" is not owned by "${email}".`,
			);
		});

		test("peer is not connected to the account", async ({ ctx }) => {
			// Self account
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: otherAccountId } = await insertAccount(ctx);
			// Connected account
			await insertConnectedPeers(ctx, [accountId, otherAccountId]);
			// Not connected account
			const { id: notConnectedPeerId } = await insertPeer(ctx, accountId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ id: notConnectedPeerId }),
				"NOT_FOUND",
				`Peer "${notConnectedPeerId}" doesn't have account connected to it.`,
			);
		});
	});

	describe("functionality", () => {
		test("account is unlinked from a peer", async ({ ctx }) => {
			// Self account
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: otherAccountId } = await insertAccount(ctx);
			// Connected account
			const [{ id: connectedPeerId }] = await insertConnectedPeers(ctx, [
				accountId,
				otherAccountId,
			]);
			// Verify other peers are not affected
			await insertPeer(ctx, accountId);
			await insertPeer(ctx, otherAccountId);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({ id: connectedPeerId }),
			);
		});
	});
});
