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
	acceptIntentionDialog,
	expectScreenshotWithSchemes,
}) => {
	const { debt } = await mockDebt({
		generateDebts: generateDebtWithUpdated((updatedAt) =>
			add.zonedDateTime(updatedAt, { seconds: 1 }),
		),
	});
	await openDebtScreen(debt.id);
	await acceptIntentionButton.click();
	await expectScreenshotWithSchemes("dialog.png", {
		locator: acceptIntentionDialog,
		// In dark mode the dialog has a 1px inset box-shadow (a subtle
		// border glow) that each browser rasterizes slightly differently
		// right at pixel (0, 0). One pixel in, past the blur, the flat
		// content background is consistent across browsers.
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [1, 1],
			},
			...expectedPixels.slice(1),
		],
	});
});
