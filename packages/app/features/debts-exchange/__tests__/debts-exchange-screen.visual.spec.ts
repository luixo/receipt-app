import { mergeTests } from "@playwright/test";

import { test as debtsGroupFixture } from "~app/components/app/__tests__/debts-group.utils";

import { test as localTest } from "./utils";

const test = mergeTests(localTest, debtsGroupFixture);

test("Screen", async ({
	openDebtsExchangeScreen,
	expectScreenshotWithSchemes,
	mockDebts,
	user: userSelector,
	debtsGroup,
}) => {
	const { user, debts } = mockDebts();
	await openDebtsExchangeScreen(user.id, { awaitDebts: debts.length });
	await expectScreenshotWithSchemes("wrapper.png", {
		mask: [debtsGroup, userSelector],
	});
});
