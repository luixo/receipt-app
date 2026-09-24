import { QueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { fromEntries, pick } from "remeda";
import { describe, expect } from "vitest";

import { test } from "~tests/backend/utils/test";
import { apiCookieNames } from "~utils/mocks";
import { router as appRouter } from "~web/handlers/index";
import { t } from "~web/handlers/trpc";
import { withTestServer } from "~web/handlers/utils.test";
import { getServerTrpcClient } from "~web/utils/server/trpc";

import { getLoaderTrpcClient } from "./trpc";

const router = t.router({
	getHeaders: t.procedure.query(({ ctx }) =>
		fromEntries([...ctx.reqHeaders.entries()]),
	),
});

describe("Server tRPC client", () => {
	test("queries run without HTTP", async () => {
		const client = getServerTrpcClient(
			appRouter,
			new Request("http://example.com/"),
		);
		const result = await client.utils.ping.query({ timeout: 0 });
		expect(result).toStrictEqual({ message: "PONG" });
	});

	test("auth errors retain their tRPC code", async () => {
		const client = getServerTrpcClient(
			appRouter,
			new Request("http://example.com/"),
		);
		await expect(client.user.get.query()).rejects.toMatchObject({
			data: { code: "UNAUTHORIZED" },
		});
		await expect(client.user.get.query()).rejects.toBeInstanceOf(
			TRPCClientError,
		);
	});
});

describe("Loader tRPC client", () => {
	test("Queries run locally", async ({ ctx }) => {
		await withTestServer(ctx, appRouter, async ({ url }) => {
			const queryClient = new QueryClient();
			const client = getLoaderTrpcClient({
				queryClient,
				request: new Request(url),
			});
			const result = await queryClient.fetchQuery(
				client.utils.ping.queryOptions({ timeout: 0 }),
			);
			expect(result).toStrictEqual({ message: "PONG" });
		});
	});

	test("Proxy requests retain HTTP routing", async ({ ctx }) => {
		await withTestServer(ctx, router, async ({ url }) => {
			const queryClient = new QueryClient();
			url.searchParams.set("debug", "true");
			const client = getLoaderTrpcClient<typeof router>({
				queryClient,
				request: new Request(url, {
					headers: { cookie: `${apiCookieNames.proxyPort}=1234` },
				}),
			});
			const resultHeaders = await queryClient.fetchQuery(
				client.getHeaders.queryOptions(),
			);
			const expectedHeaders = [
				["x-debug", "true"],
				["x-source", "ssr-loader"],
				["host", url.host],
			] as const;
			expect(
				pick(
					resultHeaders,
					expectedHeaders.map(([key]) => key),
				),
			).toStrictEqual<typeof resultHeaders>(fromEntries(expectedHeaders));
		});
	});
});
