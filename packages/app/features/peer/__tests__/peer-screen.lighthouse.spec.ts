import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Peer screen Lighthouse audit", async ({ mockBase, runAudit }) => {
	const { targetPeer } = await mockBase();
	const scores = await runAudit({
		to: "/peers/$id",
		params: { id: targetPeer.id },
	});
	expect(scores).toStrictEqual({
		accessibility: 0.85,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 0.5,
	});
});
