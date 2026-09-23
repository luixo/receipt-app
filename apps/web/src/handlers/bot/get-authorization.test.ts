import { describe, expect } from "vitest";

import { createContext } from "~tests/backend/utils/context";
import { insertAccount, insertSession } from "~tests/backend/utils/data";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get-authorization";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("bot.getAuthorization", () => {
	describe("functionality", () => {
		test("no session for bot user id", async ({ ctx }) => {
			const caller = createCaller(createContext(ctx));
			const result = await caller.procedure({ botUserId: "tg:1" });
			expect(result).toStrictEqual<typeof result>({ authorized: false });
		});

		test("session is expired", async ({ ctx }) => {
			const { id: accountId } = await insertAccount(ctx);
			await insertSession(ctx, accountId, {
				botUserId: "tg:2",
				expirationTimestamp: Temporal.Now.zonedDateTimeISO().subtract({
					minutes: 1,
				}),
			});
			const caller = createCaller(createContext(ctx));
			const result = await caller.procedure({ botUserId: "tg:2" });
			expect(result).toStrictEqual<typeof result>({ authorized: false });
		});

		test("session is valid", async ({ ctx }) => {
			const { id: accountId } = await insertAccount(ctx);
			await insertSession(ctx, accountId, { botUserId: "tg:3" });
			const caller = createCaller(createContext(ctx));
			const result = await caller.procedure({ botUserId: "tg:3" });
			expect(result).toStrictEqual<typeof result>({ authorized: true });
		});
	});
});
