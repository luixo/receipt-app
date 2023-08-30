import { describe, expect } from "vitest";

import { t } from "next-app/handlers/trpc";
import { createAuthContext } from "next-tests/utils/context";
import { insertAccountWithSession } from "next-tests/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

import { procedure } from "./get-list";

const router = t.router({ procedure });

describe("currency.getList", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure({ locale: "en" }),
		);

		test("invalid locale", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure({ locale: "foo" }),
				"BAD_REQUEST",
				"Locale foo is invalid.",
			);
		});
	});

	describe("functionality", () => {
		test(`list returned in "en" locale`, async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ locale: "en" });
			expect(result).toMatchSnapshot();
		});
	});
});
