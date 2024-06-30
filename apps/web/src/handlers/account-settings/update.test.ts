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
				.procedure({ type: "manualAcceptDebts", value: true }),
		);
	});

	describe("functionality", () => {
		describe("manualAcceptDebts", () => {
			test("settings not found - updated with default-like", async ({
				ctx,
			}) => {
				// Verifying other accounts are not affected
				await insertAccount(ctx);
				const { sessionId } = await insertAccountWithSession(ctx);
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ type: "manualAcceptDebts", value: false }),
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
					caller.procedure({ type: "manualAcceptDebts", value: true }),
				);
			});

			test("settings found", async ({ ctx }) => {
				// Verifying other accounts are not affected
				await insertAccount(ctx);
				const { sessionId } = await insertAccountWithSession(ctx, {
					account: { settings: { manualAcceptDebts: true } },
				});
				const caller = router.createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ type: "manualAcceptDebts", value: false }),
				);
			});
		});
	});
});
