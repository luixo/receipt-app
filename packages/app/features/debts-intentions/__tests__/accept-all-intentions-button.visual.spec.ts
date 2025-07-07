import { mergeTests } from "@playwright/test";

import { test as debtsGroupFixture } from "~app/components/app/__tests__/debts-group.utils";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test as localTest } from "./accept-all-intentions-button.utils";

const test = mergeTests(localTest, debtsGroupFixture);

test("Button", async ({
	page,
	openDebtIntentions,
	expectScreenshotWithSchemes,
	api,
	mockDebts,
	acceptAllIntentionButton,
}) => {
	await api.mockUtils.authPage({ page });
	mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 6 }),
	});
	await openDebtIntentions();
	await expectScreenshotWithSchemes("button.png", {
		locator: acceptAllIntentionButton,
	});
});
