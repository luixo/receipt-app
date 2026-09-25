import { expect, test } from "~tests/frontend/fixtures";

test("Register screen Lighthouse audit", async ({ api, runAudit }) => {
	api.mockUtils.noAuthPage();
	const scores = await runAudit({ to: "/register" });
	expect(scores).toStrictEqual({
		accessibility: 0.84,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 0.5,
	});
});
