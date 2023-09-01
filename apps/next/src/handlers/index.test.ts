import type { HTTPHeaders } from "@trpc/client";
import { createTRPCProxyClient, httpLink } from "@trpc/client";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import findFreePorts from "find-free-ports";
import { sql } from "kysely";
import type { NextApiRequest, NextApiResponse } from "next";
import superjson from "superjson";
import { describe, expect } from "vitest";

import { createContext } from "next-app/handlers/context";
import type { TestContext } from "next-tests/utils/test";
import { test } from "next-tests/utils/test";

import { router } from "./index";

describe("router index", () => {
	test("fake test", async () => {
		// This fake test is needed to include all the sub-routers and procedures in the coverage
		expect(router).toBeTruthy();
	});

	describe("http server", () => {
		const runServer = async (ctx: TestContext, port: number) => {
			const httpServer = createHTTPServer({
				router,
				createContext: ({ req, res }) =>
					createContext({
						req: req as NextApiRequest,
						res: res as NextApiResponse,
						...ctx,
					}),
			});
			await new Promise<void>((resolve) => {
				httpServer.listen(port, "localhost", resolve);
			});
			return async () => {
				await new Promise<void>((resolve, reject) => {
					httpServer.server.close((err) => (err ? reject(err) : resolve()));
				});
			};
		};

		const createClient = (port: number, headers: HTTPHeaders) =>
			createTRPCProxyClient<typeof router>({
				links: [
					httpLink({
						url: `http://localhost:${port}`,
						headers: () => headers,
					}),
				],
				transformer: superjson,
			});

		// Covering errorFormatter function
		test("error formatter works", async ({ ctx }) => {
			const port = (await findFreePorts())[0]!;
			const destroy = await runServer(ctx, port);
			const client = createClient(port, { cookie: "authToken=fake" });
			await expect(() =>
				client.account.get.query(),
			).rejects.toThrowErrorMatchingSnapshot();
			await destroy();
		});
	});

	// Covering SQL error logging
	test("SQL error logger works", async ({ ctx }) => {
		await expect(() => sql`SELECT foo`.execute(ctx.database)).rejects.toThrow();
		const loggedMessages = ctx.logger.getMessages();
		await expect(loggedMessages).toHaveLength(1);
		await expect(loggedMessages[0]!).toHaveLength(1);
		await expect(loggedMessages[0]![0]!).toHaveProperty("duration");
		type MessageType = { duration: number; sql: string };
		const typedMessage = loggedMessages[0]![0] as MessageType;
		await expect(typedMessage.duration).toBeTypeOf("number");
		typedMessage.duration = 0.111;
		await expect(typedMessage).toMatchSnapshot();
	});
});
