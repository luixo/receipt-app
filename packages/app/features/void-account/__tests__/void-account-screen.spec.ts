import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("On load without token", async ({
	page,
	api,
	voidButton,
	cancelButton,
	snapshotQueries,
}) => {
	api.mockUtils.noAuthPage();

	await snapshotQueries(() => page.goto("/void-account"));
	await expect(page).toHaveTitle("RA - Void account");
	await expect(page.locator("h2")).toHaveText("Something went wrong");
	await expect(voidButton).not.toBeAttached();
	await expect(cancelButton).not.toBeAttached();
});
