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
	await page.navigate({ to: "/void-user", search: { token } });
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"Void account",
	);
	await expectScreenshotWithSchemes("token.png");
});

test(`"auth.voidUser" mutation`, async ({
	page,
	api,
	voidButton,
	expectScreenshotWithSchemes,
	awaitCacheKey,
	clearToasts,
	faker,
}) => {
	api.mockUtils.noAuthPage();
	api.mockFirst("auth.voidUser", () => {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Mock "auth.voidUser" error`,
		});
	});

	const token = faker.string.uuid();
	await page.navigate({ to: "/void-user", search: { token } });
	await voidButton.click();
	await awaitCacheKey("auth.voidUser", { error: 1 });
	await clearToasts();
	await expectScreenshotWithSchemes("error.png");

	const voidUserPause = api.createPause();
	api.mockFirst("auth.voidUser", async () => {
		await voidUserPause.promise;
		return { email: "foo@gmail.com" };
	});
	await voidButton.click();
	await expectScreenshotWithSchemes("loading.png");
	voidUserPause.resolve();
	await awaitCacheKey("auth.voidUser");
	await clearToasts();
	await expectScreenshotWithSchemes("success.png");
});
