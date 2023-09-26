import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccountSettings,
	insertAccountWithSession,
} from "@tests/backend/utils/data";
import { expectUnauthorizedError } from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { t } from "next-app/handlers/trpc";

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
