import { describe } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

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
				const { sessionId } = await insertAccountWithSession(ctx, {
					account: { settings: { autoAcceptDebts: true } },
				});
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ type: "autoAcceptDebts", value: false }),
				);
			});
		});
	});
});
