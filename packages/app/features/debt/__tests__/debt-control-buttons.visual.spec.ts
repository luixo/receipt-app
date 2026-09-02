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
	// Can't crop to the dialog locator: in dark mode the modal has a 1px
	// inset box-shadow (a subtle border glow) that blends into its very
	// edge pixels, and each browser rasterizes that 1px blur slightly
	// differently, so the corner-color stability check never agrees on one
	// value across projects. Shoot the full page with the dialog open
	// instead - its corner is flat backdrop-dimmed page background.
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
