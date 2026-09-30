import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Peer debts screen Lighthouse audit", async ({ mockDebts, runAudit }) => {
	const { debtPeer } = await mockDebts();
	const scores = await runAudit({
		to: "/debts/peer/$id",
		params: { id: debtPeer.id },
	});
	expect(scores).toStrictEqual({
		accessibility: 0.73,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 0.46,
	});
});
