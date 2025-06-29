import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Open without token", async ({
	api,
	page,
	expectScreenshotWithSchemes,
	clearToasts,
}) => {
	api.mockUtils.noAuthPage();

	await page.goto("/void-account");
	await expect(page.locator("h1")).toHaveText("Void account");
	await clearToasts();
	await expectScreenshotWithSchemes("no-token.png");
});
