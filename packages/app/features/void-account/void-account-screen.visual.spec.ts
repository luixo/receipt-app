import { test } from "./utils.spec";

test.describe("Void account screen - visual", () => {
	test("Open without token", async ({
		api,
		page,
		expectScreenshotWithSchemes,
	}) => {
		api.mockUtils.noAuth();

		await page.goto("/void-account");
		await expectScreenshotWithSchemes("no-token.png");
	});
});
