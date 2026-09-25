import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Debts transfer screen Lighthouse audit", async ({
	mockDebtsTransfer,
	runAudit,
}) => {
	const { fromPeer, toPeer } = await mockDebtsTransfer();
	const scores = await runAudit({
		to: "/debts/transfer",
		search: { from: fromPeer.id, to: toPeer.id },
	});
	expect(scores).toStrictEqual({
		accessibility: 0.89,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 0.5,
	});
});
