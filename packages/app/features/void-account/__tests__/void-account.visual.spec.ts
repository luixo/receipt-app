import { TRPCError } from "@trpc/server";

import { test } from "./utils";

test.describe("Void account - visual", () => {
	test("Open with token", async ({
		api,
		page,
		expectScreenshotWithSchemes,
	}) => {
		api.mockUtils.noAuth();

		await page.goto("/void-account?token=foo");
		await expectScreenshotWithSchemes("token.png");
	});

	test.describe(`"auth.voidAccount" mutation`, () => {
		test(`loading / success`, async ({
			page,
			api,
			voidButton,
			expectScreenshotWithSchemes,
		}) => {
			api.mockUtils.noAuth();
			api.mock("auth.voidAccount", { email: "foo@gmail.com" });
			api.pause("auth.voidAccount");

			await page.goto("/void-account?token=foo");
			await voidButton.click();
			await expectScreenshotWithSchemes("loading.png");

			api.unpause("auth.voidAccount");
			await expectScreenshotWithSchemes("success.png");
		});

		test(`error`, async ({
			page,
			api,
			voidButton,
			expectScreenshotWithSchemes,
		}) => {
			api.mockUtils.noAuth();
			api.mock("auth.voidAccount", () => {
				throw new TRPCError({
					code: "CONFLICT",
					message: `Mock "auth.voidAccount" error`,
				});
			});

			await page.goto("/void-account?token=foo");
			await voidButton.click();
			await expectScreenshotWithSchemes("error.png");
		});
	});
});
