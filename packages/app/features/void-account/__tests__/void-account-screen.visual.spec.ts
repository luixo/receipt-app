import { test } from "./utils";

test("Open without token", async ({
	api,
	page,
	expectScreenshotWithSchemes,
	clearToasts,
}) => {
	api.mockUtils.noAuth();

	await page.goto("/void-account");
	await clearToasts();
	await expectScreenshotWithSchemes("no-token.png");
});
