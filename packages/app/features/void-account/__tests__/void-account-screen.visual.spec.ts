import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Open without token", async ({
	api,
	page,
	expectScreenshotWithSchemes,
}) => {
	api.mockUtils.noAuthPage();

	await page.goto("/void-account");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"Void account",
	);
	await expectScreenshotWithSchemes("no-token.png");
});
