import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import { insertAccountWithSession } from "@tests/backend/utils/data";
import { expectUnauthorizedError } from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./get";

const router = t.router({ procedure });

describe("account.get", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure(),
		);
	});

	describe("functionality", () => {
		test("verified account", async ({ ctx }) => {
			const { sessionId, accountId, name } = await insertAccountWithSession(
				ctx,
			);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));

			const account = await caller.procedure();

			expect(account).toStrictEqual<typeof account>({
				account: { id: accountId, verified: true },
				user: { name },
			});
		});

		test("unverified account", async ({ ctx }) => {
			const { sessionId, accountId, name } = await insertAccountWithSession(
				ctx,
				{ account: { confirmation: {} } },
			);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));

			const account = await caller.procedure();

			expect(account).toStrictEqual<typeof account>({
				account: { id: accountId, verified: false },
				user: { name },
			});
		});
	});
});
