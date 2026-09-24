import { describe } from "vitest";

import { createContext } from "~tests/backend/utils/context";
import {
	insertResetPasswordIntention,
	insertUser,
} from "~tests/backend/utils/data";
import { expectDatabaseDiffSnapshot } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./cleanup";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("resetPasswordIntentions.cleanup", () => {
	describe("functionality", () => {
		test("reset password intentions are removed", async ({ ctx }) => {
			const { id: userId } = await insertUser(ctx);
			const now = Temporal.Now.zonedDateTimeISO();
			await insertResetPasswordIntention(ctx, userId, {
				// non-expired intention
				expiresTimestamp: now.add({ minutes: 1 }),
			});
			await insertResetPasswordIntention(ctx, userId, {
				// just expired intention
				expiresTimestamp: now.subtract({ minutes: 1 }),
			});
			await insertResetPasswordIntention(ctx, userId, {
				// long expired intention
				expiresTimestamp: now.subtract({ years: 1 }),
			});
			const caller = createCaller(createContext(ctx));
			await expectDatabaseDiffSnapshot(ctx, () => caller.procedure());
		});
	});
});
