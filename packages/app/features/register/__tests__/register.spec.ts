import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test.extend({ collectCoverage: true })("On load", async ({
	page,
	api,
	registerButton,
	snapshotQueries,
	awaitCacheKey,
}) => {
	api.mockUtils.noAuthPage();

		await snapshotQueries(
			async () => {
				await page.goto("/register");
				await awaitCacheKey("account.get", { errored: 1 });
			},
			{
				whitelistKeys: "account.get",
			},
		);
		await expect(page).toHaveTitle("RA - Register");
		await expect(registerButton).toBeDisabled();
	},
);

test("Invalid form disables submit button", async ({
	page,
	api,
	registerButton,
	fillInvalidFields,
}) => {
	api.mockUtils.noAuthPage();

	await page.goto("/register");
	await fillInvalidFields();
	await expect(registerButton).toBeDisabled();
});

test("'auth.register' mutation", async ({
	page,
	api,
	registerButton,
	fillValidFields,
	snapshotQueries,
	withLoader,
	verifyToastTexts,
	consoleManager,
	awaitCacheKey,
}) => {
	// Remove this ignored pattern when we will explicitly redirect to "/receipts"
	consoleManager.ignore('Abort fetching component for route: "/"');
	api.mockUtils.noAuthPage();
	api.mockUtils.authPage();
	api.mockFirst("receipts.getPaged", {
		items: [],
		hasMore: false,
		cursor: -1,
		count: 0,
	});
	api.mockFirst("auth.register", () => {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Mock "auth.register" error`,
		});
	});

	await page.goto("/register");
	await fillValidFields();
	await snapshotQueries(async () => {
		await registerButton.click();
		await awaitCacheKey("auth.register", { errored: 1 });
		await verifyToastTexts(`Mock "auth.register" error`);
	});
	await expect(page).toHaveURL("/register");

	const registerPause = api.createPause();
	api.mockFirst("auth.register", async () => {
		await registerPause.promise;
		return { account: { id: "test" } };
	});
	const buttonWithLoader = withLoader(registerButton);
	await expect(buttonWithLoader).toBeHidden();
	await snapshotQueries(
		async () => {
			await registerButton.click();
			await verifyToastTexts("Registering..");
		},
		{ name: "loading" },
	);
	await expect(registerButton).toBeDisabled();
	await expect(buttonWithLoader).toBeVisible();
	const inputs = await page.locator("input").all();
	for (const input of inputs) {
		// eslint-disable-next-line no-await-in-loop
		await expect(input).toBeDisabled();
	}

	await snapshotQueries(
		async () => {
			registerPause.resolve();
			await awaitCacheKey("auth.register");
			await verifyToastTexts("Register successful, redirecting..");
		},
		{
			whitelistKeys: "account.get",
			blacklistKeys: "receipts.getPaged",
			skipQueries: true,
			name: "success",
		},
	);
	await expect(page).toHaveURL("/receipts");
});
