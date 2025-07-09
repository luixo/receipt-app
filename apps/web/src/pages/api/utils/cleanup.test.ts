import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect } from "vitest";

import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { withTestServer } from "~web/handlers/utils.test";
import { getServerRouteMethod } from "~web/pages/api/test.utils";

import { ServerRoute } from "./cleanup";

const POST = getServerRouteMethod(ServerRoute, "POST");

const removedSessions = faker.number.int({ min: 3000, max: 10000 });
const removedResetPasswordIntentions = faker.number.int({
	min: 3000,
	max: 10000,
});
const router = t.router({
	sessions: t.router({
		cleanup: t.procedure.mutation(({ ctx }) => {
			const errorMessage = ctx.event.node.req.headers["x-error"];
			if (errorMessage !== undefined) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: String(errorMessage),
				});
			}
			return removedSessions;
		}),
	}),
	resetPasswordIntentions: t.router({
		cleanup: t.procedure.mutation(() => removedResetPasswordIntentions),
	}),
});

describe("cleanup", () => {
	describe("failure", () => {
		test("one of the procedures failed", async ({ ctx }) => {
			await withTestServer(ctx, router, async ({ url }) => {
				const errorMessage = faker.lorem.sentence();
				const response = await POST({
					context: undefined,
					pathname: "/api/utils/cleanup",
					request: new Request(url, {
						headers: { "x-error": errorMessage },
					}),
					params: {},
				});
				const result = {
					status: response.status,
					data: await response.text(),
				};
				expect(result).toEqual<typeof result>({
					status: 500,
					data: `Error on cleanup: TRPCClientError: ${errorMessage}`,
				});
			});
		});
	});

	test("success", async ({ ctx }) => {
		await withTestServer(ctx, router, async ({ url }) => {
			const response = await POST({
				context: undefined,
				pathname: "/api/utils/cleanup",
				request: new Request(url),
				params: {},
			});
			const result = {
				status: response.status,
				data: await response.text(),
			};
			expect(result).toEqual<typeof result>({
				status: 200,
				data: `Removed ${removedSessions} sessions and ${removedResetPasswordIntentions} reset password intentions`,
			});
		});
	});
});
