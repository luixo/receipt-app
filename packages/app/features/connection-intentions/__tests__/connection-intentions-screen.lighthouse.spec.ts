import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Connection intentions screen Lighthouse audit", async ({
	mockConnectionIntentions,
	runAudit,
}) => {
	await mockConnectionIntentions();
	const scores = await runAudit({
		to: "/peers/connections",
	});
	expect(scores).toStrictEqual({
		accessibility: 0.88,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 0.5,
	});
});
