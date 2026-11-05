import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import { insertUserWithSession } from "~tests/backend/utils/data";
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("user.get", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());
	});

	describe("functionality", () => {
		test("verified  user", async ({ ctx }) => {
			const {
				sessionId,
				userId,
				name,
				user: { avatarTimestamp, email },
			} = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));

			const user = await caller.procedure();

			expect(user).toStrictEqual<typeof user>({
				user: {
					id: userId,
					email,
					verified: true,
					avatarUrl: `https://fake-endpoint.org/test-bucket/avatars/${userId}.png?lastModified=${avatarTimestamp?.epochMilliseconds}`,
					role: undefined,
				},
				peer: { name },
			});
		});

		test("unverified  user", async ({ ctx }) => {
			const {
				sessionId,
				userId,
				name,
				user: { email },
			} = await insertUserWithSession(ctx, {
				user: { confirmation: {}, avatarTimestamp: null },
			});
			const caller = createCaller(createAuthContext(ctx, sessionId));

			const user = await caller.procedure();

			expect(user).toStrictEqual<typeof user>({
				user: {
					id: userId,
					email,
					verified: false,
					avatarUrl: undefined,
					role: undefined,
				},
				peer: { name },
			});
		});

		test("user with role", async ({ ctx }) => {
			const {
				sessionId,
				userId,
				name,
				user: { avatarTimestamp, email },
			} = await insertUserWithSession(ctx, { user: { role: "role" } });
			const caller = createCaller(createAuthContext(ctx, sessionId));

			const user = await caller.procedure();

			expect(user).toStrictEqual<typeof user>({
				user: {
					id: userId,
					email,
					verified: true,
					avatarUrl: `https://fake-endpoint.org/test-bucket/avatars/${userId}.png?lastModified=${avatarTimestamp?.epochMilliseconds}`,
					role: "role",
				},
				peer: { name },
			});
		});
	});
});
