import { describe } from "vitest";

import { createContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertResetPasswordIntention,
} from "~tests/backend/utils/data";
import { expectDatabaseDiffSnapshot } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { add, getNow, subtract } from "~utils/date";
import { t } from "~web/handlers/trpc";

import { procedure } from "./cleanup";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("resetPasswordIntentions.cleanup", () => {
	describe("functionality", () => {
		test("reset password intentions are removed", async ({ ctx }) => {
			const { id: accountId } = await insertAccount(ctx);
			const now = getNow.zonedDateTime();
			await insertResetPasswordIntention(ctx, accountId, {
				// non-expired intention
				expiresTimestamp: add.zonedDateTime(now, { minutes: 1 }),
			});
			await insertResetPasswordIntention(ctx, accountId, {
				// just expired intention
				expiresTimestamp: subtract.zonedDateTime(now, { minutes: 1 }),
			});
			await insertResetPasswordIntention(ctx, accountId, {
				// long expired intention
				expiresTimestamp: subtract.zonedDateTime(now, { years: 1 }),
			});
			const caller = createCaller(await createContext(ctx));
			await expectDatabaseDiffSnapshot(ctx, () => caller.procedure());
		});
	});
});
