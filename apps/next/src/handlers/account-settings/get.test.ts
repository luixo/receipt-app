import { describe, expect } from "vitest";

import { t } from "next-app/handlers/trpc";
import { createAuthContext } from "next-tests/utils/context";
import {
	insertAccountSettings,
	insertAccountWithSession,
} from "next-tests/utils/data";
import { expectUnauthorizedError } from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

import { procedure } from "./get";

const router = t.router({ procedure });

describe("accountSettings.get", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure(),
		);
	});

	describe("functionality", () => {
		test("settings not found - default returned", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expect(await caller.procedure()).toMatchSnapshot();
		});

		test("settings found - default", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			await insertAccountSettings(ctx, accountId, { autoAcceptDebts: false });
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expect(await caller.procedure()).toMatchSnapshot();
		});

		test("settings found - changed", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			await insertAccountSettings(ctx, accountId, { autoAcceptDebts: true });
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expect(await caller.procedure()).toMatchSnapshot();
		});
	});
});
