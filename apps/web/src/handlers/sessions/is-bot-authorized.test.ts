import { describe, expect } from "vitest";

import { createContext } from "~tests/backend/utils/context";
import { insertAccount, insertSession } from "~tests/backend/utils/data";
import { test } from "~tests/backend/utils/test";
import { getNow, subtract } from "~utils/date";
import { t } from "~web/handlers/trpc";

import { procedure } from "./is-bot-authorized";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("sessions.isBotAuthorized", () => {
	describe("functionality", () => {
		test("no session for bot user id", async ({ ctx }) => {
			const caller = createCaller(await createContext(ctx));
			const result = await caller.procedure({ botUserId: "tg:1" });
			expect(result).toStrictEqual<typeof result>({ authorized: false });
		});

		test("session is expired", async ({ ctx }) => {
			const { id: accountId } = await insertAccount(ctx);
			await insertSession(ctx, accountId, {
				botUserId: "tg:2",
				expirationTimestamp: subtract.zonedDateTime(getNow.zonedDateTime(), {
					minutes: 1,
				}),
			});
			const caller = createCaller(await createContext(ctx));
			const result = await caller.procedure({ botUserId: "tg:2" });
			expect(result).toStrictEqual<typeof result>({ authorized: false });
		});

		test("session is valid", async ({ ctx }) => {
			const { id: accountId } = await insertAccount(ctx);
			await insertSession(ctx, accountId, { botUserId: "tg:3" });
			const caller = createCaller(await createContext(ctx));
			const result = await caller.procedure({ botUserId: "tg:3" });
			expect(result).toStrictEqual<typeof result>({ authorized: true });
		});
	});
});
