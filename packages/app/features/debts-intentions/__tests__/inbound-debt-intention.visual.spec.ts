import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test } from "./utils";

test("Row", async ({
	mockDebts,
	openDebtIntentions,
	expectScreenshotWithSchemes,
	inboundDebtIntentionRow,
}) => {
	await mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 1 }),
	});
	await openDebtIntentions();
	await expectScreenshotWithSchemes("inbound-row.png", {
		locator: inboundDebtIntentionRow,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [8, 8],
			},
			...expectedPixels.slice(1),
		],
	});
});
