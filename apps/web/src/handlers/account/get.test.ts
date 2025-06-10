import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import { insertAccountWithSession } from "~tests/backend/utils/data";
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("account.get", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());
	});

	describe("functionality", () => {
		test("verified account", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				name,
				account: { avatarUrl, email },
			} = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));

			const account = await caller.procedure();

			expect(account).toStrictEqual<typeof account>({
				account: {
					id: accountId,
					email,
					verified: true,
					avatarUrl,
					role: undefined,
				},
				user: { name },
			});
		});

		test("unverified account", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				name,
				account: { email },
			} = await insertAccountWithSession(ctx, {
				account: { confirmation: {}, avatarUrl: null },
			});
			const caller = createCaller(await createAuthContext(ctx, sessionId));

			const account = await caller.procedure();

			expect(account).toStrictEqual<typeof account>({
				account: {
					id: accountId,
					email,
					verified: false,
					avatarUrl: undefined,
					role: undefined,
				},
				user: { name },
			});
		});

		test("account with role", async ({ ctx }) => {
			const {
				sessionId,
				accountId,
				name,
				account: { avatarUrl, email },
			} = await insertAccountWithSession(ctx, { account: { role: "role" } });
			const caller = createCaller(await createAuthContext(ctx, sessionId));

			const account = await caller.procedure();

			expect(account).toStrictEqual<typeof account>({
				account: {
					id: accountId,
					email,
					verified: true,
					avatarUrl,
					role: "role",
				},
				user: { name },
			});
		});
	});
});
