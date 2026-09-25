import { expect, test } from "~tests/frontend/fixtures";

test("Settings screen Lighthouse audit", async ({ api, runAudit }) => {
	await api.mockUtils.authPage();
	const scores = await runAudit({ to: "/settings" });
	expect(scores).toStrictEqual({
		accessibility: 0.84,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 0.5,
	});
});
