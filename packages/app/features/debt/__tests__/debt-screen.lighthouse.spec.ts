import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Debt screen Lighthouse audit", async ({ mockDebt, runAudit }) => {
	const { debt } = await mockDebt();
	const scores = await runAudit({
		to: "/debts/$id",
		params: { id: debt.id },
	});
	expect(scores).toStrictEqual({
		accessibility: 0.79,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 0.5,
	});
});
