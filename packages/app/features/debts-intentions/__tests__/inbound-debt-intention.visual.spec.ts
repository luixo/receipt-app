import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test } from "./utils";

test("Row", async ({
	mockDebts,
	page,
	awaitCacheKey,
	expectScreenshotWithSchemes,
	inboundDebtIntentionRow,
}) => {
	await mockDebts({
		generateDebtIntentions: (opts) =>
			defaultGenerateDebts({ ...opts, amount: 1 }),
	});
	await page.navigate({ to: "/debts/intentions" });
	await awaitCacheKey("debtIntentions.getAll");
	await expectScreenshotWithSchemes("inbound-row.png", {
		locator: inboundDebtIntentionRow,
		pixelsPreset: "surface",
		shift: 8,
	});
});
