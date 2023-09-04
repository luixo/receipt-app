import { describe } from "vitest";

import { t } from "next-app/handlers/trpc";
import { createAuthContext } from "next-tests/utils/context";
import {
	insertAccount,
	insertAccountSettings,
	insertAccountWithSession,
} from "next-tests/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectUnauthorizedError,
} from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

import { procedure } from "./update";

const router = t.router({ procedure });

describe("accountSettings.update", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router
				.createCaller(context)
				.procedure({ type: "autoAcceptDebts", value: true }),
		);
	});

	describe("functionality", () => {
		describe("autoAcceptDebts", () => {
			test("settings not found - updated with default-like", async ({
				ctx,
			}) => {
				// Verifying other accounts are not affected
				await insertAccount(ctx);
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ type: "autoAcceptDebts", value: false }),
				);
			});

			test("settings not found - updated with non-default value", async ({
				ctx,
			}) => {
				// Verifying other accounts are not affected
				await insertAccount(ctx);
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ type: "autoAcceptDebts", value: true }),
				);
			});

			test("settings found", async ({ ctx }) => {
				// Verifying other accounts are not affected
				await insertAccount(ctx);
				const { sessionId, accountId } = await insertAccountWithSession(ctx);
				await insertAccountSettings(ctx, accountId, { autoAcceptDebts: true });
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ type: "autoAcceptDebts", value: false }),
				);
			});
		});
	});
});
