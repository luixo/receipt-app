import {
	defaultGenerateDebts,
	remapDebts,
	theirDesynced,
	theirNonExistent,
	theirSynced,
} from "~tests/frontend/generators/debts";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";

import { test } from "./utils";

test("Full screen", async ({
	page,
	faker,
	mockDebts,
	expectScreenshotWithSchemes,
}) => {
	const { debtPeer } = await mockDebts({
		generatePeers: (opts) =>
			defaultGeneratePeers(opts).map((peer) => ({
				...peer,
				connectedUser: {
					id: faker.string.uuid(),
					email: faker.internet.email(),
				},
			})),
		generateDebts: (opts) =>
			remapDebts([theirDesynced, theirSynced, theirNonExistent])(
				defaultGenerateDebts({ ...opts, amount: 3 }),
			),
	});
	await page.navigate({ to: "/debts/peer/$id", params: { id: debtPeer.id } });
	await expectScreenshotWithSchemes("full-screen.png");
});

test("Pagination loading state", async ({
	page,
	mockDebts,
	api,
	expectScreenshotWithSchemes,
	paginationBlock,
	awaitCacheKey,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const { debtPeer } = await mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 25 }),
	});
	await page.navigate({ to: "/debts/peer/$id", params: { id: debtPeer.id } });
	await awaitCacheKey("debts.getByPeerPaged");
	const pause = api.createPause();
	api.mockFirst("debts.getByPeerPaged", async ({ next }) => {
		await pause.promise;
		return next();
	});
	await paginationBlock
		.getByRole("button", { name: "pagination item 2" })
		.click();
	await awaitCacheKey("debts.getByPeerPaged", {
		input: {
			cursor: 10,
			limit: 10,
			peerId: debtPeer.id,
			filters: { showResolved: false },
		},
		pending: 1,
	});
	await expectScreenshotWithSchemes("pagination-loading.png");
});
