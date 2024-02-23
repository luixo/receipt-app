import { TRPCClientError } from "@trpc/client";
import { TRPC_ERROR_CODES_BY_KEY } from "@trpc/server/rpc";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import { insertAccountWithSession } from "@tests/backend/utils/data";
import { expectTRPCError } from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { AUTH_COOKIE } from "next-app/utils/server-cookies";

import { getClientServer } from "./utils.test";

import { router } from "./index";

describe("errors formatting", () => {
	// Covering errorFormatter function
	test("client error formatter works", async ({ ctx }) => {
		const { start, destroy, client } = await getClientServer(ctx, router, {
			cookies: {
				[AUTH_COOKIE]: "fake",
			},
		});
		await start();
		const error = await client.account.get.query().catch((e) => e);
		expect(error).toBeInstanceOf(TRPCClientError);
		const typedError = error as TRPCClientError<typeof router>;
		expect(typedError.shape?.data.stack).toMatch(
			/^TRPCError: Session id mismatch\n/,
		);
		expect(typedError.shape).toEqual<(typeof typedError)["shape"]>({
			code: TRPC_ERROR_CODES_BY_KEY.UNAUTHORIZED,
			message: "Session id mismatch",
			data: {
				code: "UNAUTHORIZED",
				httpStatus: 401,
				path: "account.get",
				stack: typedError.shape?.data.stack,
			},
		});
		await destroy();
	});

	test("zod error formatting", async ({ ctx }) => {
		const { sessionId } = await insertAccountWithSession(ctx);
		const caller = router.createCaller(createAuthContext(ctx, sessionId));
		await expectTRPCError(
			() => caller.users.add({ name: "", publicName: "" }),
			"BAD_REQUEST",
			`Zod errors\n\nAt "name": Minimal length for user name is 1\n\nAt "publicName": Minimal length for user name is 1`,
		);
		await expectTRPCError(
			() => caller.users.add({ name: "" }),
			"BAD_REQUEST",
			`Zod error\n\nAt "name": Minimal length for user name is 1`,
		);
		await expectTRPCError(
			// @ts-expect-error Type misuse for testing purposes
			() => caller.users.add(12),
			"BAD_REQUEST",
			`Zod error\n\nAt "<root>": Expected object, received number`,
		);
	});
});
