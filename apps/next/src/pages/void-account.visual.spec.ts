import { TRPCError } from "@trpc/server";

import { test } from "./void-account.utils.spec";

test.describe("Void account page - visual", () => {
	test.describe("On open", () => {
		test("Without token", async ({
			api,
			page,
			expectScreenshotWithSchemes,
		}) => {
			api.mockUtils.noAuth();

			await page.goto("/void-account");
			await expectScreenshotWithSchemes("no-token.png");
		});

		test("With token", async ({ api, page, expectScreenshotWithSchemes }) => {
			api.mockUtils.noAuth();

			await page.goto("/void-account?token=foo");
			await expectScreenshotWithSchemes("token.png");
		});
	});

	test(`Loading "auth.voidAccount" mutation`, async ({
		page,
		api,
		voidButton,
		expectScreenshotWithSchemes,
	}) => {
		api.mockUtils.noAuth();
		api.pause("auth.voidAccount");

		await page.goto("/void-account?token=foo");
		await voidButton.click();
		await expectScreenshotWithSchemes("loading.png");
	});

	test(`Error on "auth.voidAccount" mutation`, async ({
		page,
		api,
		voidButton,
		expectScreenshotWithSchemes,
		clearToasts,
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
		await clearToasts({ shouldAwait: true });
		await expectScreenshotWithSchemes("error.png");
	});

	test(`Success on "auth.voidAccount" mutation`, async ({
		page,
		api,
		voidButton,
		clearToasts,
		expectScreenshotWithSchemes,
	}) => {
		api.mockUtils.noAuth();
		api.mock("auth.voidAccount", { email: "foo@gmail.com" });

		await page.goto("/void-account?token=foo");
		await voidButton.click();
		await clearToasts({ shouldAwait: true });
		await expectScreenshotWithSchemes("success.png");
	});
});
