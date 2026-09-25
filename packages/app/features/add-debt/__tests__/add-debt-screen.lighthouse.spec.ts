import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Add debt screen Lighthouse audit", async ({ mockBase, runAudit }) => {
	await mockBase();
	const scores = await runAudit({ to: "/debts/add" });
	expect(scores).toStrictEqual({
		accessibility: 0.8,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 0.5,
	});
});
