import { TRPCError } from "@trpc/server";

import { test } from "./utils";

test("Open with token", async ({ api, page, expectScreenshotWithSchemes }) => {
	api.mockUtils.noAccount();

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
	api.mockUtils.noAccount();
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

	const voidAccountPause = api.createPause();
	api.mock("auth.voidAccount", async () => {
		await voidAccountPause.wait();
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
