import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import { insertAccountWithSession } from "~tests/backend/utils/data";
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get-list";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("currency.getList", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());
	});

	describe("functionality", () => {
		test(`list returned`, async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toMatchSnapshot();
		});
	});
});
