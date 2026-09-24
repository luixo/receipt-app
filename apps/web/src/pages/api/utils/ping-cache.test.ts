import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect, vi } from "vitest";

import { test } from "~tests/backend/utils/test";
import type { router as appRouter } from "~web/handlers/index";
import { t } from "~web/handlers/trpc";
import { getServerRouteMethod } from "~web/pages/api/test.utils";

import { Route } from "./ping-cache";

const postMethod = getServerRouteMethod(Route, "POST");

// oxlint-disable-next-line typescript/require-await
vi.mock(import("~web/handlers/index"), async () => ({
	router: t.router({
		utils: t.router({
			pingCache: t.procedure.mutation(({ ctx }) => {
				const errorMessage = ctx.reqHeaders.get("x-error");
				if (errorMessage !== null) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: errorMessage,
					});
				}
			}),
		}),
	}) as typeof appRouter,
}));

describe("ping-cache", () => {
	describe("failure", () => {
		test("procedure failed", async () => {
			const errorMessage = faker.lorem.sentence();
			const response = await postMethod({
				pathname: "/api/utils/ping-cache",
				request: new Request("http://example.com/", {
					headers: { "x-error": errorMessage },
				}),
				params: {},
			});
			const result = {
				status: response.status,
				data: await response.text(),
			};
			expect(result).toStrictEqual<typeof result>({
				status: 500,
				data: `Error on cache ping: TRPCClientError: ${errorMessage}`,
			});
		});
	});

	test("success", async () => {
		const response = await postMethod({
			pathname: "/api/utils/ping-cache",
			request: new Request("http://example.com/"),
			params: {},
		});
		const result = {
			status: response.status,
			data: await response.text(),
		};
		expect(result).toStrictEqual<typeof result>({
			status: 200,
			data: `Cache ping successful`,
		});
	});
});
