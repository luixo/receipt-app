import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Regular usage", async ({
	api,
	page,
	fields,
	faker,
	expectScreenshotWithSchemes,
}) => {
	api.mockUtils.noAuthPage();

	await page.navigate({ to: "/login" });
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Login");
	await expectScreenshotWithSchemes("empty.png");
	await fields.email.fill(faker.internet.email());
	await fields.password.fill(faker.internet.password());
	await page
		.locator("div", { has: fields.password, hasNot: fields.email })
		.locator("button")
		.click();

	await expectScreenshotWithSchemes("filled.png");
});

test("'auth.login' mutation", async ({
	page,
	api,
	faker,
	loginButton,
	withLoader,
	expectScreenshotWithSchemes,
	fields,
}) => {
	api.mockUtils.noAuthPage();
	const loginPause = api.createPause();
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

	await page.navigate({ to: "/login" });
	await fields.email.fill(faker.internet.email());
	await fields.password.fill(faker.internet.password());
	await loginButton.click();
	await expect(withLoader(loginButton)).toBeVisible();

	await expectScreenshotWithSchemes("loading.png");
});

test("Errors in fields", async ({
	api,
	page,
	fields,
	expectScreenshotWithSchemes,
}) => {
	api.mockUtils.noAuthPage();

	await page.navigate({ to: "/login" });
	await fields.email.fill("this-is-not-email-address");
	await fields.password.fill("-");

	await expectScreenshotWithSchemes("fill-errors.png");
});

test("Forgot password modal", async ({
	api,
	page,
	forgotPasswordButton,
	resetSubmitButton,
	resetModal,
	resetEmailField,
	expectScreenshotWithSchemes,
	faker,
}) => {
	api.mockUtils.noAuthPage();

	await page.navigate({ to: "/login" });
	await forgotPasswordButton.click();
	await expect(resetModal).toBeVisible();

	await expectScreenshotWithSchemes("modal/open.png", {
		locator: resetModal,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [1, 1],
			},
			...expectedPixels.slice(1),
		],
	});
	await resetEmailField.fill(faker.internet.email());
	await expect(resetSubmitButton).toHaveText("Send email with a reset link");
	await expectScreenshotWithSchemes("modal/filled.png", {
		locator: resetModal,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [1, 1],
			},
			...expectedPixels.slice(1),
		],
	});
});

test("'resetPasswordIntentions.add' mutation", async ({
	page,
	api,
	forgotPasswordButton,
	resetSubmitButton,
	resetModal,
	withLoader,
	expectScreenshotWithSchemes,
	awaitCacheKey,
	clearToasts,
	faker,
	resetEmailField,
}) => {
	api.mockUtils.noAuthPage();
	const resetErrorPause = api.createPause();
	api.mockFirst("resetPasswordIntentions.add", async () => {
		await resetErrorPause.promise;
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Mock 'resetPasswordIntentions.add' error",
		});
	});

	await page.navigate({ to: "/login" });
	await forgotPasswordButton.click();
	await resetEmailField.fill(faker.internet.email());
	await resetSubmitButton.click();
	resetErrorPause.resolve();
	await awaitCacheKey("resetPasswordIntentions.add", { error: 1 });
	await clearToasts();

	await expectScreenshotWithSchemes("modal/error.png", {
		locator: resetModal,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [1, 1],
			},
			...expectedPixels.slice(1),
		],
	});

	const resetPause = api.createPause();
	api.mockFirst("resetPasswordIntentions.add", async () => {
		await resetPause.promise;
		return undefined;
	});
	await resetSubmitButton.click();
	await expect(withLoader(resetSubmitButton)).toBeVisible();

	await expectScreenshotWithSchemes("modal/loading.png", {
		locator: resetModal,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [1, 1],
			},
			...expectedPixels.slice(1),
		],
	});

	resetPause.resolve();
	await awaitCacheKey("resetPasswordIntentions.add");
	await clearToasts();

	await expectScreenshotWithSchemes("modal/success.png", {
		locator: resetModal,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [1, 1],
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Reset form errors in fields", async ({
	api,
	page,
	forgotPasswordButton,
	resetEmailField,
	resetModal,
	expectScreenshotWithSchemes,
}) => {
	api.mockUtils.noAuthPage();

	await page.navigate({ to: "/login" });
	await forgotPasswordButton.click();
	await resetEmailField.fill("this-is-not-email-address");

	await expectScreenshotWithSchemes("modal/fill-errors.png", {
		locator: resetModal,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [1, 1],
			},
			...expectedPixels.slice(1),
		],
	});
});
