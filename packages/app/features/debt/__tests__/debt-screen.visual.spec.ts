import { mergeTests } from "@playwright/test";

import {
	test as debtControlButtonsTest,
	generateDebtWithUpdated,
} from "./debt-control-buttons.utils";
import { test as localTest } from "./debt-screen.utils";

const test = mergeTests(localTest, debtControlButtonsTest);

test("Screen", async ({
	mockDebt,
	openDebtScreen,
	acceptIntentionButton,
	expectScreenshotWithSchemes,
}) => {
	const { debt } = await mockDebt({
		generateDebts: generateDebtWithUpdated((updatedAt) =>
			updatedAt.add({ seconds: 1 }),
		),
	});
	await openDebtScreen(debt.id);
	await expectScreenshotWithSchemes("screen.png", {
		mask: [acceptIntentionButton],
	});
});
