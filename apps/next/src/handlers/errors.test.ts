import type { HTTPHeaders } from "@trpc/client";
import { TRPCClientError, createTRPCClient, httpLink } from "@trpc/client";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { TRPC_ERROR_CODES_BY_KEY } from "@trpc/server/rpc";
import findFreePorts from "find-free-ports";
import type { NextApiRequest, NextApiResponse } from "next";
import superjson from "superjson";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import { insertAccountWithSession } from "@tests/backend/utils/data";
import { expectTRPCError } from "@tests/backend/utils/expect";
import type { TestContext } from "@tests/backend/utils/test";
import { test } from "@tests/backend/utils/test";
import { createContext } from "next-app/handlers/context";

import { router } from "./index";

describe("errors formatting", () => {
	const runServer = async (ctx: TestContext) => {
		const port = (await findFreePorts())[0]!;
		const httpServer = createHTTPServer({
			router,
			createContext: ({ req, res }) =>
				createContext({
					req: req as NextApiRequest,
					res: res as NextApiResponse,
					info: { isBatchCall: false, calls: [] },
					...ctx,
				}),
		});
		await new Promise<void>((resolve) => {
			httpServer.listen(port, "localhost", resolve);
		});
		return {
			destroy: async () => {
				await new Promise<void>((resolve, reject) => {
					httpServer.close((err) => (err ? reject(err) : resolve()));
				});
			},
			port,
		};
	};

	const createClient = (port: number, headers: HTTPHeaders) =>
		createTRPCClient<typeof router>({
			links: [
				httpLink({
					url: `http://localhost:${port}`,
					headers: () => headers,
				}),
			],
			transformer: superjson,
		});

	// Covering errorFormatter function
	test("client error formatter works", async ({ ctx }) => {
		const { destroy, port } = await runServer(ctx);
		const client = createClient(port, { cookie: "authToken=fake" });
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
	});
});
