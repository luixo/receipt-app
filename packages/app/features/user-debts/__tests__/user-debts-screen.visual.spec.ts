import {
	defaultGenerateDebts,
	remapDebts,
	theirDesynced,
	theirNonExistent,
	theirSynced,
} from "~tests/frontend/generators/debts";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

import { test } from "./utils";

test("Full screen", async ({
	page,
	faker,
	mockDebts,
	expectScreenshotWithSchemes,
}) => {
	const { debtUser } = await mockDebts({
		generateUsers: (opts) =>
			defaultGenerateUsers(opts).map((user) => ({
				...user,
				connectedAccount: {
					id: faker.string.uuid(),
					email: faker.internet.email(),
				},
			})),
		generateDebts: (opts) =>
			remapDebts([theirDesynced, theirSynced, theirNonExistent])(
				defaultGenerateDebts({ ...opts, amount: 3 }),
			),
	});
	await page.navigate({ to: "/debts/user/$id", params: { id: debtUser.id } });
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
	const { debtUser } = await mockDebts({
		generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 25 }),
	});
	await page.navigate({ to: "/debts/user/$id", params: { id: debtUser.id } });
	await awaitCacheKey("debts.getByUserPaged");
	const pause = api.createPause();
	api.mockFirst("debts.getByUserPaged", async ({ next }) => {
		await pause.promise;
		return next();
	});
	await paginationBlock
		.getByRole("button", { name: "pagination item 2" })
		.click();
	await awaitCacheKey("debts.getByUserPaged", {
		input: {
			cursor: 10,
			limit: 10,
			userId: debtUser.id,
			filters: { showResolved: false },
		},
		pending: 1,
	});
	await expectScreenshotWithSchemes("pagination-loading.png");
});
