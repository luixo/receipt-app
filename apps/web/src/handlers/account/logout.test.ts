import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import { insertAccountWithSession } from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { getResHeaders } from "~web/utils/headers";

import { procedure } from "./logout";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("account.logout", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());
	});

	describe("functionality", () => {
		test("session is removed", async ({ ctx }) => {
			// Verifying other accounts are not affected
			await insertAccountWithSession(ctx);
			const { sessionId } = await insertAccountWithSession(ctx);
			const context = await createAuthContext(ctx, sessionId);
			const caller = createCaller(context);
			await expectDatabaseDiffSnapshot(ctx, () => caller.procedure());
			const responseHeaders = getResHeaders(context);
			expect(responseHeaders).toStrictEqual<typeof responseHeaders>([
				[
					"set-cookie",
					"authToken=; Path=/; Expires=Wed, 01 Jan 2020 00:00:00 GMT; HttpOnly; SameSite=Strict",
				],
			]);
		});
	});
});
