import { TRPCError } from "@trpc/server";

import { test } from "./utils";

test("Open with token", async ({ api, page, expectScreenshotWithSchemes }) => {
	api.mockUtils.noAuth();

	await page.goto("/void-account?token=foo");
	await expectScreenshotWithSchemes("token.png");
});

test(`"auth.voidAccount" mutation`, async ({
	page,
	api,
	voidButton,
	expectScreenshotWithSchemes,
	awaitCacheKey,
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
	await awaitCacheKey("auth.voidAccount");
	await clearToasts();
	await expectScreenshotWithSchemes("error.png");

	api.pause("auth.voidAccount");
	await voidButton.click();
	await clearToasts();
	await expectScreenshotWithSchemes("loading.png");

	api.mock("auth.voidAccount", { email: "foo@gmail.com" });
	api.unpause("auth.voidAccount");
	await awaitCacheKey("auth.voidAccount");
	await clearToasts();
	await expectScreenshotWithSchemes("success.png");
});
