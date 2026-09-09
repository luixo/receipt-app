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

	const token = faker.string.uuid();
	await snapshotQueries(() =>
		page.navigate({ to: "/void-account", search: { token } }),
	);
	await expect(page.getByRole("heading", { level: 3 })).toHaveText(
		"Are you sure you want to void your account?",
	);
	await expect(voidButton).toBeEnabled();
	await expect(voidButton).toHaveText("Yes");
	await expect(cancelButton).toBeEnabled();
	await expect(cancelButton).toHaveText("No");
});

test("Navigating back to the home page", async ({
	page,
	api,
	cancelButton,
	faker,
}) => {
	api.mockUtils.noAuthPage();
	const token = faker.string.uuid();
	await page.navigate({ to: "/void-account", search: { token } });
	await cancelButton.click();
	await page.expectUrl({ to: "/login" });
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
	await page.navigate({ to: "/void-account", search: { token } });

	await snapshotQueries(async () => {
		await voidButton.click();
		await verifyToastTexts(
			`Void account failed: Mock "auth.voidAccount" error`,
		);
		await awaitCacheKey("auth.voidAccount", { error: 1 });
	});
	await page.expectUrl({ to: "/void-account", search: { token } });

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
	await page.expectUrl({ to: "/void-account", search: { token } });

	await snapshotQueries(
		async () => {
			voidAccountPause.resolve();
			await verifyToastTexts("Account successfully voided, redirecting..");
			await awaitCacheKey("auth.voidAccount");
		},
		{ skipQueries: true, name: "success" },
	);
	await expect(page.getByRole("heading", { level: 3 })).toHaveText(
		"foo@gmail.com",
	);
	await expect(page.getByRole("heading", { level: 4 })).toHaveText(
		"Account removed succesfully",
	);
	await page.expectUrl({ to: "/void-account", search: { token } });
	await page.getByText("To login page").click();
	await page.expectUrl({ to: "/login" });
});
