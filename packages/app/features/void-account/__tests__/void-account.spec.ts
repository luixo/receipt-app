import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("On load with token", async ({
	page,
	api,
	voidButton,
	cancelButton,
	snapshotQueries,
	faker,
}) => {
	api.mockUtils.noAuthPage();

	await snapshotQueries(() =>
		page.goto(`/void-account?token=${faker.string.uuid()}`),
	);
	await expect(page.locator("h3")).toHaveText(
		"Are you sure you want to void your account?",
	);
	await expect(voidButton).toBeEnabled();
	await expect(voidButton).toHaveText("Yes");
	await expect(cancelButton).toBeEnabled();
	await expect(cancelButton).toHaveText("No");
});

test("nagivating back to the home page", async ({
	page,
	api,
	cancelButton,
	faker,
}) => {
	api.mockUtils.noAuthPage();
	await page.goto(`/void-account?token=${faker.string.uuid()}`);
	await cancelButton.click();
	await expect(page).toHaveURL("/login");
});

test("'auth.voidAccount' mutation", async ({
	page,
	api,
	voidButton,
	snapshotQueries,
	awaitCacheKey,
	verifyToastTexts,
	withLoader,
	cancelButton,
	faker,
}) => {
	api.mockUtils.noAuthPage();
	api.mockFirst("auth.voidAccount", () => {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Mock "auth.voidAccount" error`,
		});
	});

	const token = faker.string.uuid();
	await page.goto(`/void-account?token=${token}`);

	await snapshotQueries(async () => {
		await voidButton.click();
		await verifyToastTexts(
			`Void account failed: Mock "auth.voidAccount" error`,
		);
		await awaitCacheKey("auth.voidAccount", { errored: 1 });
	});
	await expect(page).toHaveURL(`/void-account?token=${token}`);

	const voidAccountPause = api.createPause();
	api.mockFirst("auth.voidAccount", async () => {
		await voidAccountPause.promise;
		return { email: "foo@gmail.com" };
	});
	const buttonWithLoader = withLoader(voidButton);
	await expect(buttonWithLoader).toBeHidden();
	await snapshotQueries(
		async () => {
			await voidButton.click();
			await verifyToastTexts();
			await expect(voidButton).toBeDisabled();
			await expect(cancelButton).toBeDisabled();
			await expect(buttonWithLoader).toBeVisible();
		},
		{ name: "loading" },
	);
	await expect(page).toHaveURL(`/void-account?token=${token}`);

	await snapshotQueries(
		async () => {
			voidAccountPause.resolve();
			await verifyToastTexts("Account successfully voided, redirecting..");
			await awaitCacheKey("auth.voidAccount");
		},
		{ skipQueries: true, name: "success" },
	);
	await expect(page.locator("h3")).toHaveText("foo@gmail.com");
	await expect(page.locator("h4")).toHaveText("Account removed succesfully");
	await expect(page).toHaveURL(`/void-account?token=${token}`);
	await page.getByText("To login page").click();
	await expect(page).toHaveURL("/login");
});
