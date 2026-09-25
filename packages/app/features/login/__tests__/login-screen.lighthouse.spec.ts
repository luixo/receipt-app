import { expect, test } from "~tests/frontend/fixtures";

test("Login screen Lighthouse audit", async ({ api, runAudit }) => {
	api.mockUtils.noAuthPage();
	const scores = await runAudit({ to: "/login" });
	expect(scores).toStrictEqual({
		accessibility: 0.84,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 0.5,
	});
});
