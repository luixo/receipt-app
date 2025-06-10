import { describe } from "vitest";

import { createContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertResetPasswordIntention,
} from "~tests/backend/utils/data";
import { expectDatabaseDiffSnapshot } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { MINUTE, YEAR } from "~utils/time";
import { t } from "~web/handlers/trpc";

import { procedure } from "./cleanup";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("resetPasswordIntentions.cleanup", () => {
	describe("functionality", () => {
		test("reset password intentions are removed", async ({ ctx }) => {
			const { id: accountId } = await insertAccount(ctx);
			await insertResetPasswordIntention(ctx, accountId, {
				// non-expired intention
				expiresTimestamp: new Date(Date.now() + MINUTE),
			});
			await insertResetPasswordIntention(ctx, accountId, {
				// just expired intention
				expiresTimestamp: new Date(Date.now() - MINUTE),
			});
			await insertResetPasswordIntention(ctx, accountId, {
				// long expired intention
				expiresTimestamp: new Date(Date.now() - YEAR),
			});
			const caller = createCaller(await createContext(ctx));
			await expectDatabaseDiffSnapshot(ctx, () => caller.procedure());
		});
	});
});
