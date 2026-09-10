import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("On load", async ({ page, api, loginButton, snapshotQueries }) => {
	api.mockUtils.noAuthPage();

	await snapshotQueries(() => page.navigate({ to: "/login" }), {
		whitelistKeys: "account.get",
	});
	await expect(page).toHaveTitle("RA - Login");
	await expect(
		page.getByRole("heading", { level: 1, name: "Login" }),
	).toBeVisible();
	await expect(loginButton).toBeDisabled();
});

test.describe("Form", () => {
	test("Invalid form disables submit button", async ({
		page,
		api,
		loginButton,
		fields,
	}) => {
		api.mockUtils.noAuthPage();

		await page.navigate({ to: "/login" });
		await fields.email.fill("this-is-not-email-address");
		await fields.password.fill("-");
		await expect(loginButton).toBeDisabled();
	});

	test("'auth.login' mutation", async ({
		page,
		api,
		faker,
		loginButton,
		fields,
		snapshotQueries,
		withLoader,
		verifyToastTexts,
		awaitCacheKey,
	}) => {
		api.mockUtils.noAuthPage();
		const mockErrorMessage = `Mock "auth.login" error`;
		api.mockFirst("auth.login", () => {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: mockErrorMessage,
			});
		});

		await page.navigate({ to: "/login", search: { redirect: "/receipts" } });
		await fields.email.fill(faker.internet.email());
		await fields.password.fill(faker.internet.password());
		await snapshotQueries(
			async () => {
				await loginButton.click();
				await awaitCacheKey("auth.login", { error: 1 });
				await verifyToastTexts(`Login failed: ${mockErrorMessage}`);
			},
			{
				whitelistKeys: "account.get",
			},
		);
		await page.expectUrl({ to: "/login", search: { redirect: "/receipts" } });

		const loginPause = api.createPause();
		await api.mockUtils.authPage();
		api.mockFirst("auth.login", async () => {
			await loginPause.promise;
			return {
				account: {
					id: "test-account-id",
					verified: true,
					avatarUrl: undefined,
					role: undefined,
				},
				user: { name: "Test user" },
			};
		});
		const buttonWithLoader = withLoader(loginButton);
		await expect(buttonWithLoader).toBeHidden();
		await snapshotQueries(
			async () => {
				await loginButton.click();
				await awaitCacheKey("auth.login", { pending: 1 });
				await expect(buttonWithLoader).toBeVisible();
				await verifyToastTexts();
			},
			{ name: "loading", whitelistKeys: "account.get" },
		);
		await expect(loginButton).toBeDisabled();
		await expect(buttonWithLoader).toBeVisible();
		const inputs = await page.locator("input").all();
		for (const input of inputs) {
			await expect(input).toBeDisabled();
		}

		await snapshotQueries(
			async () => {
				loginPause.resolve();
				await awaitCacheKey("auth.login");
				await verifyToastTexts("Login successful, redirecting..");
			},
			{
				whitelistKeys: "account.get",
				blacklistKeys: "receipts.getPaged",
				name: "success",
			},
		);
		await page.expectUrl({ to: "/receipts" });
	});
});

test.describe("Forgot password modal", () => {
	test("Forgot password modal opens and closes", async ({
		page,
		api,
		forgotPasswordButton,
		resetModal,
		modalCross,
	}) => {
		api.mockUtils.noAuthPage();

		await page.navigate({ to: "/login" });
		await expect(resetModal).toBeHidden();
		await forgotPasswordButton.click();
		await expect(resetModal).toBeVisible();
		await modalCross.click();
		await expect(resetModal).toBeHidden();
		await page.expectUrl({ to: "/login" });
	});

	test("Reset form with invalid email disables submit button", async ({
		page,
		api,
		forgotPasswordButton,
		resetSubmitButton,
		resetEmailField,
	}) => {
		api.mockUtils.noAuthPage();

		await page.navigate({ to: "/login" });
		await forgotPasswordButton.click();
		await resetEmailField.fill("this-is-not-email-address");
		await expect(resetSubmitButton).toBeDisabled();
	});

	test("'resetPasswordIntentions.add' mutation", async ({
		page,
		api,
		forgotPasswordButton,
		resetSubmitButton,
		resetModal,
		resetEmailField,
		snapshotQueries,
		withLoader,
		verifyToastTexts,
		awaitCacheKey,
		faker,
	}) => {
		api.mockUtils.noAuthPage();
		api.mockFirst("resetPasswordIntentions.add", () => {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Mock "resetPasswordIntentions.add" error`,
			});
		});

		await page.navigate({ to: "/login" });
		await forgotPasswordButton.click();
		const resetEmail = faker.internet.email();
		await resetEmailField.fill(resetEmail);
		await snapshotQueries(
			async () => {
				await resetSubmitButton.click();
				await awaitCacheKey("resetPasswordIntentions.add", { error: 1 });
				await verifyToastTexts(
					`Password reset failed: Mock "resetPasswordIntentions.add" error`,
				);
			},
			{ name: "error" },
		);
		await expect(resetModal).toBeVisible();
		await page.expectUrl({ to: "/login" });

		const resetPause = api.createPause();
		api.mockFirst("resetPasswordIntentions.add", async () => {
			await resetPause.promise;
			return undefined;
		});
		const buttonWithLoader = withLoader(resetSubmitButton);
		await expect(buttonWithLoader).toBeHidden();
		await snapshotQueries(
			async () => {
				await resetSubmitButton.click();
				await awaitCacheKey("resetPasswordIntentions.add", { pending: 1 });
				await expect(buttonWithLoader).toBeVisible();
				await verifyToastTexts();
			},
			{ name: "loading" },
		);
		await expect(resetSubmitButton).toBeDisabled();
		await expect(resetEmailField).toBeDisabled();
		await expect(buttonWithLoader).toBeVisible();

		await snapshotQueries(
			async () => {
				resetPause.resolve();
				await awaitCacheKey("resetPasswordIntentions.add");
				await verifyToastTexts(
					`Password reset link was sent to email "${resetEmail}"`,
				);
			},
			{ name: "success", skipQueries: true },
		);
		await expect(resetModal).toHaveText(
			new RegExp(`Reset password link was sent to ${resetEmail}`),
		);
		await page.expectUrl({ to: "/login" });
	});
});
