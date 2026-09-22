import { mergeTests } from "@playwright/test";

import { test as peersSuggestFixture } from "~app/components/app/__tests__/peers-suggest.utils";

import { test as localTest } from "./inbound-connection-intention.utils";

const test = mergeTests(localTest, peersSuggestFixture);

test("Row", async ({
	page,
	mockConnectionIntentions,
	expectScreenshotWithSchemes,
	peersSuggest,
	awaitCacheKey,
}) => {
	await mockConnectionIntentions({ inboundAmount: 1 });
	await page.navigate({ to: "/peers/connections" });
	await awaitCacheKey("accountConnectionIntentions.getAll");
	await expectScreenshotWithSchemes("row.png", {
		locator: page.getByTestId("inbound-connection-intention"),
		mask: [peersSuggest],
	});
});
