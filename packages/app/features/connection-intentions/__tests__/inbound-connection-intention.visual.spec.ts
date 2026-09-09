import { mergeTests } from "@playwright/test";

import { test as usersSuggestFixture } from "~app/components/app/__tests__/users-suggest.utils";

import { test as localTest } from "./inbound-connection-intention.utils";

const test = mergeTests(localTest, usersSuggestFixture);

test("Row", async ({
	page,
	mockConnectionIntentions,
	expectScreenshotWithSchemes,
	usersSuggest,
	awaitCacheKey,
}) => {
	await mockConnectionIntentions({ inboundAmount: 1 });
	await page.navigate({ to: "/users/connections" });
	await awaitCacheKey("accountConnectionIntentions.getAll");
	await expectScreenshotWithSchemes("row.png", {
		locator: page.getByTestId("inbound-connection-intention"),
		mask: [usersSuggest],
	});
});
