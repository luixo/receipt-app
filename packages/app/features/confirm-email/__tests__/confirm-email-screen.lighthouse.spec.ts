import { expect, test } from "~tests/frontend/fixtures";

test("Confirm email screen Lighthouse audit", async ({ api, runAudit }) => {
	api.mockUtils.noAuthPage();
	const scores = await runAudit({ to: "/confirm-email" });
	expect(scores).toStrictEqual({
		accessibility: 0.93,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 1,
	});
});
