import { describe, expect } from "vitest";

import { createAuthContext } from "#tests/backend/utils/context.ts";
import { insertUserWithSession } from "#tests/backend/utils/data.ts";
import {
	expectDatabaseDiffSnapshot,
	expectUnauthorizedError,
} from "#tests/backend/utils/expect.ts";
import { test } from "#tests/backend/utils/test.ts";
import { t } from "#web/handlers/trpc.ts";

import { procedure } from "./logout";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("user.logout", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());
	});

	describe("functionality", () => {
		test("session is removed", async ({ ctx }) => {
			// Verifying other users are not affected
			await insertUserWithSession(ctx);
			const { sessionId } = await insertUserWithSession(ctx);
			const context = createAuthContext(ctx, sessionId);
			const caller = createCaller(context);
			await expectDatabaseDiffSnapshot(ctx, () => caller.procedure());
			const responseHeaders = [...context.resHeaders.entries()];
			expect(responseHeaders).toStrictEqual<typeof responseHeaders>([
				[
					"set-cookie",
					"authToken=; Path=/; Expires=Wed, 01 Jan 2020 00:00:00 GMT; HttpOnly; SameSite=Strict",
				],
			]);
		});
	});
});
