import { TRPCError } from "@trpc/server";

import { expect } from "@tests/frontend/fixtures";

import { test } from "./void-account.utils.spec";

test.describe("Void account page", () => {
	test.describe("On load", () => {
		test("Without token", async ({
			page,
			api,
			voidButton,
			cancelButton,
			snapshotQueries,
		}) => {
			api.mockUtils.noAuth();

			await snapshotQueries(() => page.goto("/void-account"), {
				whitelistKeys: "account.get",
			});
			await expect(page).toHaveTitle("RA - Void account");
			await expect(page.locator("h2")).toHaveText("Something went wrong");
			await expect(voidButton).not.toBeAttached();
			await expect(cancelButton).not.toBeAttached();
		});

		test("With token", async ({
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

	test.describe("'auth.voidAccount' mutation", () => {
		test("loading", async ({
			page,
			api,
			voidButton,
			cancelButton,
			snapshotQueries,
			withLoader,
			verifyToastTexts,
		}) => {
			api.mockUtils.noAuth();
			api.pause("auth.voidAccount");

			await page.goto("/void-account?token=foo");

			await snapshotQueries(async () => {
				const buttonWithLoader = withLoader(voidButton);
				await expect(buttonWithLoader).not.toBeVisible();
				await voidButton.click();
				await verifyToastTexts([]);
				await expect(voidButton).toBeDisabled();
				await expect(cancelButton).toBeDisabled();
				await expect(buttonWithLoader).toBeVisible();
			});
			await expect(page).toHaveURL("/void-account?token=foo");
		});

		test("success", async ({
			page,
			api,
			voidButton,
			verifyToastTexts,
			snapshotQueries,
		}) => {
			api.mockUtils.noAuth();
			api.mock("auth.voidAccount", { email: "foo@gmail.com" });

			await page.goto("/void-account?token=foo");

			await snapshotQueries(async () => {
				await voidButton.click();
				await verifyToastTexts("Account successfully voided, redirecting..");
				await expect(page.locator("h3")).toHaveText("foo@gmail.com");
				await expect(page.locator("h4")).toHaveText(
					"Account removed succesfully",
				);
			});
			await expect(page).toHaveURL("/void-account?token=foo");
			await page.getByText("To login page").click();
			await expect(page).toHaveURL("/login");
		});

		test("error", async ({
			page,
			api,
			voidButton,
			snapshotQueries,
			verifyToastTexts,
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
				await expect(page).toHaveURL("/void-account?token=foo");
			});

			// Verify that "auth.voidAccount" works after error is removed
			api.mock("auth.voidAccount", { email: "foo@gmail.com" });
			await voidButton.click();
			await expect(page.locator("h4")).toHaveText(
				"Account removed succesfully",
			);
		});
	});
});
