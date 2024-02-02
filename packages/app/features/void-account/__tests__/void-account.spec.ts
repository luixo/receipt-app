import { TRPCError } from "@trpc/server";

import { expect } from "@tests/frontend/fixtures";

import { test } from "./utils";

test.describe("Void account", () => {
	test("On load with token", async ({
		page,
		api,
		voidButton,
		cancelButton,
		snapshotQueries,
	}) => {
		api.mockUtils.noAuth();

		await snapshotQueries(() => page.goto("/void-account?token=foo"), {
			whitelistKeys: "account.get",
		});
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
	}) => {
		api.mockUtils.noAuth();
		await page.goto("/void-account?token=foo");
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
	}) => {
		api.mockUtils.noAuth();
		api.mock("auth.voidAccount", () => {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Mock "auth.voidAccount" error`,
			});
		});

		await page.goto("/void-account?token=foo");

		await snapshotQueries(async () => {
			await voidButton.click();
			await verifyToastTexts(
				`Error voiding account: Mock "auth.voidAccount" error`,
			);
			await awaitCacheKey("auth.voidAccount");
		});
		await expect(page).toHaveURL("/void-account?token=foo");

		api.pause("auth.voidAccount");
		const buttonWithLoader = withLoader(voidButton);
		await expect(buttonWithLoader).not.toBeVisible();
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
		await expect(page).toHaveURL("/void-account?token=foo");

		api.mock("auth.voidAccount", { email: "foo@gmail.com" });
		await snapshotQueries(
			async () => {
				api.unpause("auth.voidAccount");
				await verifyToastTexts("Account successfully voided, redirecting..");
				await awaitCacheKey("auth.voidAccount");
			},
			{ skipQueries: true, name: "success" },
		);
		await expect(page.locator("h3")).toHaveText("foo@gmail.com");
		await expect(page.locator("h4")).toHaveText("Account removed succesfully");
		await expect(page).toHaveURL("/void-account?token=foo");
		await page.getByText("To login page").click();
		await expect(page).toHaveURL("/login");
	});
});
