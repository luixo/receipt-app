import { TRPCError } from "@trpc/server";

import { expect } from "@tests/frontend/fixtures";

import { test } from "./utils";

test.describe("Register page", () => {
	test("On load", async ({ page, api, registerButton, snapshotQueries }) => {
		api.mockUtils.noAuth();

		await snapshotQueries(() => page.goto("/register"), {
			whitelistKeys: "account.get",
		});
		await expect(page).toHaveTitle("RA - Register");
		await expect(registerButton).toBeDisabled();
	});

	test("Invalid form disables submit button", async ({
		page,
		api,
		registerButton,
		fillInvalidFields,
	}) => {
		api.mockUtils.noAuth();

		await page.goto("/register");
		await fillInvalidFields();
		await expect(registerButton).toBeDisabled();
	});

	test.describe("'auth.register' mutation", () => {
		test("loading / success", async ({
			page,
			api,
			registerButton,
			fillValidFields,
			snapshotQueries,
			withLoader,
			verifyToastTexts,
			consoleManager,
		}) => {
			// Remove this ignored pattern when we will explicitly redirect to "/receipts"
			consoleManager.ignore('Abort fetching component for route: "/"');
			api.mockUtils.noAuth();
			api.mock("auth.register", () => ({ account: { id: "test" } }));
			// We'll need it when we eventually register
			api.mockUtils.authAnyPage();
			api.mockUtils.emptyReceipts();

			await page.goto("/register");
			await fillValidFields();

			await snapshotQueries(
				async () => {
					api.pause("auth.register");
					const buttonWithLoader = withLoader(registerButton);
					await expect(buttonWithLoader).not.toBeVisible();
					await registerButton.click();
					await verifyToastTexts("Registering..");
					await expect(registerButton).toBeDisabled();
					await expect(buttonWithLoader).toBeVisible();
					const inputs = await page.locator("input").all();
					// eslint-disable-next-line no-restricted-syntax
					for (const input of inputs) {
						// eslint-disable-next-line no-await-in-loop
						await expect(input).toBeDisabled();
					}
				},
				{ name: "loading" },
			);
			await expect(page).toHaveURL("/register");

			await snapshotQueries(
				async () => {
					api.unpause("auth.register");
					await verifyToastTexts("Register successful, redirecting..");
					await expect(page).toHaveURL("/receipts");
				},
				{
					whitelistKeys: "account.get",
					blacklistKeys: "receipts.getPaged",
					skipQueries: true,
					name: "success",
				},
			);
		});

		test("error", async ({
			page,
			api,
			fillValidFields,
			registerButton,
			snapshotQueries,
			verifyToastTexts,
			consoleManager,
		}) => {
			api.mockUtils.noAuth();
			api.mock("auth.register", () => {
				throw new TRPCError({
					code: "CONFLICT",
					message: `Mock "auth.register" error`,
				});
			});

			await page.goto("/register");
			await fillValidFields();
			await snapshotQueries(async () => {
				await registerButton.click();
				await verifyToastTexts(`Mock "auth.register" error`);
				await expect(page).toHaveURL("/register");
			});

			// Remove this ignored pattern when we will explicitly redirect to "/receipts"
			consoleManager.ignore('Abort fetching component for route: "/"');
			// Verify that "auth.register" works after error is removed
			api.mock("auth.register", () => ({ account: { id: "test" } }));
			api.mockUtils.authAnyPage();
			api.mockUtils.emptyReceipts();
			await registerButton.click();
			await expect(page).toHaveURL("/receipts");
		});
	});
});
