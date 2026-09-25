import { expect, test } from "~tests/frontend/fixtures";

test("Add peer screen Lighthouse audit", async ({ api, runAudit }) => {
	await api.mockUtils.authPage();
	const scores = await runAudit({ to: "/peers/add" });
	expect(scores).toStrictEqual({
		accessibility: 0.86,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 0.5,
	});
});
