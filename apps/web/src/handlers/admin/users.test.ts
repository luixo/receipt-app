import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import type { insertPeer } from "~tests/backend/utils/data";
import {
	insertConnectedPeers,
	insertUser,
	insertUserWithSession,
} from "~tests/backend/utils/data";
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./users";

const createCaller = t.createCallerFactory(t.router({ procedure }));

const getUserShape = (
	user: Awaited<ReturnType<typeof insertUser>>,
	peer?: Awaited<ReturnType<typeof insertPeer>>,
) => ({
	user: {
		id: user.id,
		email: user.email,
		avatarUrl: user.avatarUrl,
	},
	peer: peer ? { id: peer.id, name: peer.name } : undefined,
});

describe("admin.users", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());
	});

	describe("functionality", () => {
		test("users are fetched", async ({ ctx }) => {
			const { userId, sessionId } = await insertUserWithSession(ctx, {
				user: { role: "admin" },
			});
			const foreignUser = await insertUser(ctx, { avatarUrl: null });
			const anotherForeignUser = await insertUser(ctx, {
				avatarUrl: null,
			});
			const connectedUser = await insertUser(ctx);
			const [foreignPeer] = await insertConnectedPeers(ctx, [
				userId,
				connectedUser.id,
			]);
			const anotherConnectedUser = await insertUser(ctx);
			const [anotherForeignPeer] = await insertConnectedPeers(ctx, [
				userId,
				anotherConnectedUser.id,
			]);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const users = await caller.procedure();

			expect(users).toStrictEqual<typeof users>({
				items: [
					getUserShape(foreignUser),
					getUserShape(anotherForeignUser),
					getUserShape(connectedUser, foreignPeer),
					getUserShape(anotherConnectedUser, anotherForeignPeer),
				].toSorted((a, b) => {
					const emailComparison = a.user.email.localeCompare(b.user.email);
					if (a.peer && b.peer) {
						const nameComparison = a.peer.name.localeCompare(b.peer.name);
						return nameComparison === 0 ? emailComparison : nameComparison;
					}
					if (a.peer) {
						return -1;
					}
					if (b.peer) {
						return 1;
					}
					return emailComparison;
				}),
			});
		});
	});
});
