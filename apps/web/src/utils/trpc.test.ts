import { faker } from "@faker-js/faker";
import { QueryClient } from "@tanstack/react-query";
import { fromEntries, pick } from "remeda";
import { describe, expect, vi } from "vitest";

import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { withTestServer } from "~web/handlers/utils.test";

import { getApiTrpcClient, getLoaderTrpcClient } from "./trpc";

const router = t.router({
	getSearch: t.procedure.query(
		({ ctx }) =>
			new URL(ctx.event.node.req.url ?? "", "http://localhost/").search,
	),
	getHeaders: t.procedure.query(({ ctx }) => ctx.event.node.req.headers),
});

describe("API calls", () => {
	test("search params are passed through", async ({ ctx }) => {
		await withTestServer(ctx, router, async ({ url }) => {
			const urlObject = new URL(url);
			urlObject.searchParams.set("foo", "bar");
			const client = getApiTrpcClient<typeof router>(new Request(urlObject));
			const resultSearch = await client.getSearch.query();
			expect(resultSearch).toMatch(/foo=bar/);
		});
	});

	test("headers are passed through", async ({ ctx }) => {
		await withTestServer(ctx, router, async ({ url }) => {
			const adHocHeaders = new Array(5)
				.fill(null)
				.map(
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
			expect(resultHeaders).toEqual<typeof resultHeaders>(
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
			const client = getLoaderTrpcClient<typeof router>(
				{ queryClient, request: new Request(urlObject) },
				true,
			);
			const resultHeaders = await queryClient.fetchQuery(
				client.getHeaders.queryOptions(),
			);
			const expectedHeaders = [
				["x-debug", "true"],
				["x-source", "ssr"],
				["host", url.replace("http://", "")],
			] as const;
			expect(
				pick(
					resultHeaders,
					expectedHeaders.map(([key]) => key),
				),
			).toEqual<typeof resultHeaders>(fromEntries(expectedHeaders));
			vi.unstubAllEnvs();
		});
	});
});
