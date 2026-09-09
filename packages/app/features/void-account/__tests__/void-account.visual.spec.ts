import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Open with token", async ({
	api,
	page,
	expectScreenshotWithSchemes,
	faker,
}) => {
	api.mockUtils.noAuthPage();

	const token = faker.string.uuid();
	await page.navigate({ to: "/void-account", search: { token } });
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"Void account",
	);
	await expectScreenshotWithSchemes("token.png");
});

test(`"auth.voidAccount" mutation`, async ({
	page,
	api,
	voidButton,
	expectScreenshotWithSchemes,
	awaitCacheKey,
	clearToasts,
	faker,
}) => {
	api.mockUtils.noAuthPage();
	api.mockFirst("auth.voidAccount", () => {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Mock "auth.voidAccount" error`,
		});
	});

	const token = faker.string.uuid();
	await page.navigate({ to: "/void-account", search: { token } });
	await voidButton.click();
	await awaitCacheKey("auth.voidAccount", { error: 1 });
	await clearToasts();
	await expectScreenshotWithSchemes("error.png");

	const voidAccountPause = api.createPause();
	api.mockFirst("auth.voidAccount", async () => {
		await voidAccountPause.promise;
		return { email: "foo@gmail.com" };
	});
	await voidButton.click();
	await expectScreenshotWithSchemes("loading.png");
	voidAccountPause.resolve();
	await awaitCacheKey("auth.voidAccount");
	await clearToasts();
	await expectScreenshotWithSchemes("success.png");
});
