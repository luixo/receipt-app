import { mergeTests } from "@playwright/test";

import { test as debtsGroupFixture } from "~app/components/app/__tests__/debts-group.utils";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test as localTest } from "./accept-all-intentions-button.utils";

const test = mergeTests(localTest, debtsGroupFixture);

test("Button", async ({
	openDebtIntentions,
	expectScreenshotWithSchemes,
	mockBase,
	mockDebts,
	acceptAllIntentionButton,
}) => {
	const { user } = mockBase();
	mockDebts({
		targetUserId: user.id,
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 6 }),
	});
	await openDebtIntentions();
	await expectScreenshotWithSchemes("button.png", {
		locator: acceptAllIntentionButton,
	});
});
