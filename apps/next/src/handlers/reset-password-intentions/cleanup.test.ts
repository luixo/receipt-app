import { describe } from "vitest";

import { MINUTE, YEAR } from "app/utils/time";
import { t } from "next-app/handlers/trpc";
import { createContext } from "next-tests/utils/context";
import {
	insertAccount,
	insertResetPasswordIntention,
} from "next-tests/utils/data";
import { expectDatabaseDiffSnapshot } from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

import { procedure } from "./cleanup";

const router = t.router({ procedure });

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
			const caller = router.createCaller(createContext(ctx));
			await expectDatabaseDiffSnapshot(ctx, () => caller.procedure());
		});
	});
});
