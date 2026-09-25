import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Receipts screen Lighthouse audit", async ({ mockReceipts, runAudit }) => {
	await mockReceipts();
	const scores = await runAudit({ to: "/receipts" });
	expect(scores).toStrictEqual({
		accessibility: 0.78,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 0.5,
	});
});

test("Receipt screen Lighthouse audit", async ({ mockReceipts, runAudit }) => {
	const { receipts } = await mockReceipts({ amount: 1 });
	const [receipt] = receipts;
	assert.ok(receipt);
	const scores = await runAudit({
		to: "/receipts/$id",
		params: { id: receipt.id },
	});
	expect(scores).toStrictEqual({
		accessibility: 0.71,
		"best-practices": 0.96,
		seo: 0.9,
		"agentic-browsing": 0.5,
	});
});
