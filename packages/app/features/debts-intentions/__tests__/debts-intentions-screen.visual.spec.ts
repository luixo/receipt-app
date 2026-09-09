import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test } from "./utils";

test("Empty state", async ({
	mockDebts,
	page,
	awaitCacheKey,
	expectScreenshotWithSchemes,
}) => {
	await mockDebts({
		generateDebtIntentions: (opts) =>
			defaultGenerateDebts({ ...opts, amount: 0 }),
	});
	await page.navigate({ to: "/debts/intentions" });
	await awaitCacheKey("debtIntentions.getAll");
	await expectScreenshotWithSchemes("empty.png");
});

test("Single intention", async ({
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
	await expectScreenshotWithSchemes("single-intention.png", {
		mask: [inboundDebtIntentionRow],
	});
});

test("Multiple intentions with accept all button", async ({
	mockDebts,
	page,
	awaitCacheKey,
	expectScreenshotWithSchemes,
	inboundDebtIntentionRow,
}) => {
	await mockDebts({
		generateDebtIntentions: (opts) =>
			defaultGenerateDebts({ ...opts, amount: 2 }),
	});
	await page.navigate({ to: "/debts/intentions" });
	await awaitCacheKey("debtIntentions.getAll");
	await expectScreenshotWithSchemes("multiple-intentions.png", {
		mask: [inboundDebtIntentionRow],
	});
});
