import { add } from "~utils/date";

import { generateDebtWithUpdated, test } from "./debt-control-buttons.utils";

test("Button", async ({
	mockDebt,
	openDebtScreen,
	acceptIntentionButton,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { debt } = await mockDebt({
		generateDebts: generateDebtWithUpdated((updatedAt) =>
			add.zonedDateTime(updatedAt, { seconds: 1 }),
		),
	});
	await openDebtScreen(debt.id);
	await expectScreenshotWithSchemes("button.png", {
		locator: acceptIntentionButton,
	});
});

test("Dialog", async ({
	mockDebt,
	openDebtScreen,
	acceptIntentionButton,
	expectScreenshotWithSchemes,
}) => {
	const { debt } = await mockDebt({
		generateDebts: generateDebtWithUpdated((updatedAt) =>
			add.zonedDateTime(updatedAt, { seconds: 1 }),
		),
	});
	await openDebtScreen(debt.id);
	await acceptIntentionButton.click();
	// The dialog's own background isn't the page background, so it can't be
	// screenshotted as a cropped locator (the corner-color stability check
	// assumes page background) - shoot the full page with the dialog open.
	// The modal backdrop dims the page to ~50% black, which in light mode
	// turns the white corner gray; in dark mode it stays indistinguishable
	// from black, so only the light-mode expectation needs overriding.
	await expectScreenshotWithSchemes("dialog.png", {
		mapExpectedPixels: ({ expectedPixels, colorMode }) =>
			colorMode === "light"
				? [{ ...expectedPixels[0], rgb: "#7f7f7f" }, ...expectedPixels.slice(1)]
				: expectedPixels,
	});
});
