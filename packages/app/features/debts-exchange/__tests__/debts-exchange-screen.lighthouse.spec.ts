import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Debts exchange screen Lighthouse audit", async ({
	mockDebts,
	runAudit,
}) => {
	const { debtPeer } = await mockDebts();
	const scores = await runAudit({
		to: "/debts/peer/$id/exchange",
		params: { id: debtPeer.id },
	});
	expect(scores).toStrictEqual({
		accessibility: 0.83,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 0.5,
	});
});
