import { TRPCClientError } from "@trpc/client";
import { TRPC_ERROR_CODES_BY_KEY } from "@trpc/server/rpc";
import { describe, expect } from "vitest";

import type { AppRouter } from "~app/trpc";
import { createAuthContext } from "~tests/backend/utils/context";
import { insertAccountWithSession } from "~tests/backend/utils/data";
import { expectTRPCError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { AUTH_COOKIE, serializeCookieHeader } from "~web/utils/server-cookies";

import { getClientServer } from "./utils.test";

import { router } from "./index";

const createCaller = t.createCallerFactory(router);

describe("errors formatting", () => {
	// Covering errorFormatter function
	test("client error formatter works", async ({ ctx }) => {
		const { start, destroy, client } = await getClientServer(ctx, router, {
			headers: {
				cookie: serializeCookieHeader({ [AUTH_COOKIE]: "fake" }),
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
		const caller = createCaller(createAuthContext(ctx, sessionId));
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

test("error is captured", async ({ ctx }) => {
	const { start, destroy, client } = await getClientServer(ctx, router, {
		captureError: (error) => {
			ctx.logger.warn(`Captured error: "${error.message}"`);
			return "transaction-id";
		},
		headers: {
			cookie: serializeCookieHeader({ [AUTH_COOKIE]: "fake" }),
		},
	});
	await start();
	const error: TRPCClientError<AppRouter> = await client.account.get
		.query()
		.catch((e) => e);
	expect(error.message).toBe(
		'Internal server error\nError fingerprint "transaction-id"',
	);
	expect(ctx.logger.getMessages()).toEqual([
		['Captured error: "Session id mismatch"'],
	]);
	await destroy();
});
