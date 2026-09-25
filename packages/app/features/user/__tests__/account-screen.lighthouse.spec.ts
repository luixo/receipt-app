import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Account screen Lighthouse audit", async ({ mockBase, runAudit }) => {
	await mockBase();
	const scores = await runAudit({ to: "/user" });
	expect(scores).toStrictEqual({
		accessibility: 0.93,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 0.5,
	});
});
