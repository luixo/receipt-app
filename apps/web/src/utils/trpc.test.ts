import { faker } from "@faker-js/faker";
import { QueryClient } from "@tanstack/react-query";
import { fromEntries, pick } from "remeda";
import { describe, expect, vi } from "vitest";

import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { withTestServer } from "~web/handlers/utils.test";

import { getApiTrpcClient, getLoaderTrpcClient } from "./trpc";

const router = t.router({
	getHeaders: t.procedure.query(({ ctx }) =>
		fromEntries([...ctx.reqHeaders.entries()]),
	),
});

describe("API calls", () => {
	test("headers are passed through", async ({ ctx }) => {
		await withTestServer(ctx, router, async ({ url }) => {
			const adHocHeaders = Array.from(
				{ length: 5 },
				() =>
					[faker.internet.domainWord(), faker.internet.domainWord()] as const,
			);
			const client = getApiTrpcClient<typeof router>(
				new Request(url, {
					headers: fromEntries(adHocHeaders),
				}),
			);
			const defaultHeaders = [
				["x-source", "api"],
				["host", url.replace("http://", "")],
			] as const;
			const resultHeaders = pick(
				await client.getHeaders.query(),
				[...adHocHeaders, ...defaultHeaders].map(([key]) => key),
			);
			expect(resultHeaders).toStrictEqual<typeof resultHeaders>(
				fromEntries([...adHocHeaders, ...defaultHeaders]),
			);
		});
	});
});

describe("loader call", () => {
	test("debug is passed through", async ({ ctx }) => {
		await withTestServer(ctx, router, async ({ url }) => {
			vi.stubEnv("BASE_URL", url);
			const queryClient = new QueryClient();
			const urlObject = new URL(url);
			urlObject.searchParams.set("debug", "true");
			const client = getLoaderTrpcClient<typeof router>({
				queryClient,
				request: new Request(urlObject),
			});
			const resultHeaders = await queryClient.fetchQuery(
				client.getHeaders.queryOptions(),
			);
			const expectedHeaders = [
				["x-debug", "true"],
				["x-source", "ssr-loader"],
				["host", url.replace("http://", "")],
			] as const;
			expect(
				pick(
					resultHeaders,
					expectedHeaders.map(([key]) => key),
				),
			).toStrictEqual<typeof resultHeaders>(fromEntries(expectedHeaders));
			vi.unstubAllEnvs();
		});
	});
});
