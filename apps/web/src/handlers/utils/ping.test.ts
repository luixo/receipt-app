import { describe, expect } from "vitest";

import { createContext } from "~tests/backend/utils/context";
import { expectTRPCError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./ping";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("utils.ping", () => {
	describe("functionality", () => {
		test("pong is sent", async ({ ctx }) => {
			const caller = createCaller(await createContext(ctx));
			const result = await caller.procedure({ timeout: 0 });
			expect(result).toStrictEqual<typeof result>("PONG");
		});

		test("error is thrown", async ({ ctx }) => {
			const caller = createCaller(await createContext(ctx));
			await expectTRPCError(
				() => caller.procedure({ timeout: 0, error: true }),
				"BAD_REQUEST",
				`This is bad!`,
			);
		});
	});
});
