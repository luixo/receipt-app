import { describe } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import { insertUser, insertUserWithSession } from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./update";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("userSettings.update", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({
				type: "manualAcceptDebts",
				value: true,
			}),
		);
	});

	describe("functionality", () => {
		describe("manualAcceptDebts", () => {
			test("settings not found - updated with default-like", async ({
				ctx,
			}) => {
				// Verifying other users are not affected
				await insertUser(ctx);
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ type: "manualAcceptDebts", value: false }),
				);
			});

			test("settings not found - updated with non-default value", async ({
				ctx,
			}) => {
				// Verifying other users are not affected
				await insertUser(ctx);
				const { sessionId } = await insertUserWithSession(ctx);
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ type: "manualAcceptDebts", value: true }),
				);
			});

			test("settings found", async ({ ctx }) => {
				// Verifying other users are not affected
				await insertUser(ctx);
				const { sessionId } = await insertUserWithSession(ctx, {
					user: { settings: { manualAcceptDebts: true } },
				});
				const caller = createCaller(createAuthContext(ctx, sessionId));
				await expectDatabaseDiffSnapshot(ctx, () =>
					caller.procedure({ type: "manualAcceptDebts", value: false }),
				);
			});
		});
	});
});
