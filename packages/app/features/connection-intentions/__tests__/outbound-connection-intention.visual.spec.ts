import { test } from "./outbound-connection-intention.utils";

test("Row", async ({
	page,
	mockConnectionIntentions,
	expectScreenshotWithSchemes,
	awaitCacheKey,
}) => {
	await mockConnectionIntentions({ outboundAmount: 1 });
	await page.navigate({ to: "/users/connections" });
	await awaitCacheKey("accountConnectionIntentions.getAll");
	await expectScreenshotWithSchemes("row.png", {
		locator: page.getByTestId("outbound-connection-intention"),
	});
});
