import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("On load without token", async ({
	page,
	api,
	voidButton,
	cancelButton,
	snapshotQueries,
	awaitCacheKey,
}) => {
	api.mockUtils.noAccount();

	await snapshotQueries(
		async () => {
			await page.goto("/void-account");
			await awaitCacheKey("account.get", { errored: 1 });
		},
		{
			whitelistKeys: "account.get",
		},
	);
	await expect(page).toHaveTitle("RA - Void account");
	await expect(page.locator("h2")).toHaveText("Something went wrong");
	await expect(voidButton).not.toBeAttached();
	await expect(cancelButton).not.toBeAttached();
});
