import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { describe, expect, vi } from "vitest";

import { test } from "~tests/backend/utils/test";
import type { router as appRouter } from "~web/handlers/index";
import { t } from "~web/handlers/trpc";
import { getServerRouteMethod } from "~web/pages/api/test.utils";

import { Route } from "./cleanup";

const postMethod = getServerRouteMethod(Route, "POST");

const removedSessions = faker.number.int({ min: 3000, max: 10_000 });
const removedResetPasswordIntentions = faker.number.int({
	min: 3000,
	max: 10_000,
});

// oxlint-disable-next-line typescript/require-await
vi.mock(import("~web/handlers/index"), async () => ({
	router: t.router({
		sessions: t.router({
			cleanup: t.procedure.mutation(({ ctx }) => {
				const errorMessage = ctx.reqHeaders.get("x-error");
				if (errorMessage !== null) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: errorMessage,
					});
				}
				return { count: removedSessions };
			}),
		}),
		resetPasswordIntentions: t.router({
			cleanup: t.procedure.mutation(() => ({
				count: removedResetPasswordIntentions,
			})),
		}),
	}) as typeof appRouter,
}));

describe("cleanup API handler", () => {
	describe("failure", () => {
		test("one of the procedures failed", async () => {
			const errorMessage = faker.lorem.sentence();
			const response = await postMethod({
				pathname: "/api/utils/cleanup",
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
				data: `Error on cleanup: TRPCClientError: ${errorMessage}`,
			});
		});
	});

	test("success", async () => {
		const response = await postMethod({
			pathname: "/api/utils/cleanup",
			request: new Request("http://example.com/"),
			params: {},
		});
		const result = {
			status: response.status,
			data: await response.text(),
		};
		expect(result).toStrictEqual<typeof result>({
			status: 200,
			data: `Removed ${removedSessions} sessions and ${removedResetPasswordIntentions} reset password intentions`,
		});
	});
});
