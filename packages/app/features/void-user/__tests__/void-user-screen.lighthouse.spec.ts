import { expect, test } from "~tests/frontend/fixtures";

test("Void user screen Lighthouse audit", async ({ api, runAudit }) => {
	api.mockUtils.noAuthPage();
	const scores = await runAudit({
		to: "/void-user",
	});
	expect(scores).toStrictEqual({
		accessibility: 0.93,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 1,
	});
});
