import { describe, expect } from "vitest";

import { createContext } from "~tests/backend/utils/context";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./ping-cache";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("utils.pingCache", () => {
	describe("functionality", () => {
		test("cache database ping sent", async ({ ctx }) => {
			const dbMock = ctx.cacheDbOptions.mock!;
			const caller = createCaller(createContext(ctx));
			await caller.procedure();
			const dbMessages = dbMock.getMessages();
			// Removing ping message
			expect(dbMessages).toStrictEqual<typeof dbMessages>([
				["ping", [], { result: "pong" }],
			]);
		});
	});
});
