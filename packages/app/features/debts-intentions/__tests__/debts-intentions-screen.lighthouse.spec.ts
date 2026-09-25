import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Debts intentions screen Lighthouse audit", async ({
	mockDebts,
	runAudit,
}) => {
	await mockDebts({});
	const scores = await runAudit({
		to: "/debts/intentions",
	});
	expect(scores).toStrictEqual({
		accessibility: 0.89,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 0.5,
	});
});
