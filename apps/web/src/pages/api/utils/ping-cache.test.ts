import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { assert, describe, expect } from "vitest";

import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { withTestServer } from "~web/handlers/utils.test";

import { APIRoute } from "./ping-cache";

const { POST } = APIRoute.methods;
assert(POST);

const router = t.router({
	utils: t.router({
		pingCache: t.procedure.mutation(({ ctx }) => {
			const errorMessage = ctx.event.node.req.headers["x-error"];
			if (errorMessage !== undefined) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: String(errorMessage),
				});
			}
		}),
	}),
});

describe("ping-cache", () => {
	describe("failure", () => {
		test("procedure failed", async ({ ctx }) => {
			await withTestServer(ctx, router, async ({ url }) => {
				const errorMessage = faker.lorem.sentence();
				const response = await POST({
					request: new Request(url, { headers: { "x-error": errorMessage } }),
					params: {},
				});
				const result = {
					status: response.status,
					data: await response.text(),
				};
				expect(result).toEqual<typeof result>({
					status: 500,
					data: `Error on cache ping: TRPCClientError: ${errorMessage}`,
				});
			});
		});
	});

	test("success", async ({ ctx }) => {
		await withTestServer(ctx, router, async ({ url }) => {
			const response = await POST({
				request: new Request(url),
				params: {},
			});
			const result = {
				status: response.status,
				data: await response.text(),
			};
			expect(result).toEqual<typeof result>({
				status: 200,
				data: `Cache ping successful`,
			});
		});
	});
});
