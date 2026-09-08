import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

import { test } from "./utils";

test("Empty state", async ({
	mockDebts,
	openDebtIntentions,
	expectScreenshotWithSchemes,
}) => {
	await mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 0 }),
	});
	await openDebtIntentions();
	await expectScreenshotWithSchemes("empty.png");
});

test("Single intention", async ({
	mockDebts,
	openDebtIntentions,
	expectScreenshotWithSchemes,
	inboundDebtIntentionRow,
}) => {
	await mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 1 }),
	});
	await openDebtIntentions();
	await expectScreenshotWithSchemes("single-intention.png", {
		mask: [inboundDebtIntentionRow],
	});
});

test("Multiple intentions with accept all button", async ({
	mockDebts,
	openDebtIntentions,
	expectScreenshotWithSchemes,
	inboundDebtIntentionRow,
}) => {
	await mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 2 }),
	});
	await openDebtIntentions();
	await expectScreenshotWithSchemes("multiple-intentions.png", {
		mask: [inboundDebtIntentionRow],
	});
});
