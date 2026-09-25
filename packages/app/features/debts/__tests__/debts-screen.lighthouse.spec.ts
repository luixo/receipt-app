import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Debts screen Lighthouse audit", async ({ mockDebts, runAudit }) => {
	await mockDebts();
	const scores = await runAudit({ to: "/debts" });
	expect(scores).toStrictEqual({
		accessibility: 0.82,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 0.5,
	});
});
