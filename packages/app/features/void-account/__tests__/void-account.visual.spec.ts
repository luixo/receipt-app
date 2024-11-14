import { TRPCError } from "@trpc/server";

import { test } from "./utils";

test("Open with token", async ({ api, page, expectScreenshotWithSchemes }) => {
	api.mockUtils.noAuthPage();

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
	api.mockUtils.noAuthPage();
	api.mockFirst("auth.voidAccount", () => {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Mock "auth.voidAccount" error`,
		});
	});

	await page.goto("/void-account?token=foo");
	await voidButton.click();
	await awaitCacheKey("auth.voidAccount", { errored: 1 });
	await clearToasts();
	await expectScreenshotWithSchemes("error.png");

	const voidAccountPause = api.createPause();
	api.mockFirst("auth.voidAccount", async () => {
		await voidAccountPause.promise;
		return { email: "foo@gmail.com" };
	});
	await voidButton.click();
	await clearToasts();
	await expectScreenshotWithSchemes("loading.png");
	voidAccountPause.resolve();
	await awaitCacheKey("auth.voidAccount");
	await clearToasts();
	await expectScreenshotWithSchemes("success.png");
});
