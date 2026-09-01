import { TRPCClientError } from "@trpc/client";
import { TRPC_ERROR_CODES_BY_KEY } from "@trpc/server/rpc";
import { describe, expect } from "vitest";

import type { AppRouter } from "~app/trpc";
import { AUTH_COOKIE } from "~app/utils/auth";
import { createAuthContext } from "~tests/backend/utils/context";
import { insertAccountWithSession } from "~tests/backend/utils/data";
import { expectTRPCError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { router } from "./index";
import { getTestClient, withTestServer } from "./utils.test";

const createCaller = t.createCallerFactory(router);

describe("errors formatting", () => {
	// Covering errorFormatter function
	test("client error formatter works", async ({ ctx }) => {
		await withTestServer(ctx, router, async ({ url }) => {
			const client = getTestClient<typeof router>(ctx, url, {
				headers: { cookie: `${AUTH_COOKIE}=fake` },
			});
			const queryError = await client.account.get
				.query()
				.catch((error) => error);
			expect(queryError).toBeInstanceOf(TRPCClientError);
			const typedError = queryError as TRPCClientError<typeof router>;
			expect(typedError.shape?.data.stack).toMatch(
				/^TRPCError: Session id mismatch\n/,
			);
			expect(typedError.shape).toStrictEqual<(typeof typedError)["shape"]>({
				code: TRPC_ERROR_CODES_BY_KEY.UNAUTHORIZED,
				message: "Session id mismatch",
				data: {
					code: "UNAUTHORIZED",
					httpStatus: 401,
					path: "account.get",
					stack: typedError.shape?.data.stack,
				},
				input: undefined,
			});
		});
	});

	test("zod error formatting", async ({ ctx }) => {
		const { sessionId } = await insertAccountWithSession(ctx);
		const caller = createCaller(await createAuthContext(ctx, sessionId));
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
			`Zod error\n\nAt "<root>": Invalid input: expected object, received number`,
		);
	});
});

test("error is captured", async ({ ctx }) => {
	await withTestServer(ctx, router, async ({ url }) => {
		const client = getTestClient<typeof router>(ctx, url, {
			captureError: (error) => {
				ctx.logger.warn(`Captured error: "${error.message}"`);
				return "transaction-id";
			},
			headers: { cookie: `${AUTH_COOKIE}=fake` },
		});
		const caughtError = await client.account.get
			.query()
			.catch((error) => error);
		expect(caughtError).toBeInstanceOf(TRPCClientError);
		const errorComponents = (
			caughtError as TRPCClientError<AppRouter>
		).message.split("\n");
		expect(errorComponents).toStrictEqual([
			"Internal server error",
			'Error fingerprint "transaction-id"',
			"Session id mismatch",
			...errorComponents.slice(3),
		]);
		expect(ctx.logger.getMessages()).toStrictEqual([
			['Captured error: "Session id mismatch"'],
		]);
	});
});
