import { test } from "./connection-intentions-screen.utils";

test("Empty state", async ({
	mockConnectionIntentions,
	page,
	awaitCacheKey,
	expectScreenshotWithSchemes,
}) => {
	await mockConnectionIntentions();
	await page.navigate({ to: "/users/connections" });
	await awaitCacheKey("accountConnectionIntentions.getAll");
	await expectScreenshotWithSchemes("empty.png");
});

test("Mixed connections", async ({
	mockConnectionIntentions,
	expectScreenshotWithSchemes,
	inboundRows,
	outboundRows,
	page,
	awaitCacheKey,
}) => {
	await mockConnectionIntentions({ inboundAmount: 2, outboundAmount: 2 });
	await page.navigate({ to: "/users/connections" });
	await awaitCacheKey("accountConnectionIntentions.getAll");
	await expectScreenshotWithSchemes("mixed.png", {
		mask: [inboundRows, outboundRows],
	});
});
