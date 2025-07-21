import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test.beforeEach(({ api }) => {
	api.mockUtils.noAuthPage();
});

test("On load without token", async ({ page, api, faker, snapshotQueries }) => {
	api.mockFirst("resetPasswordIntentions.get", {
		email: faker.internet.email(),
	});
	await snapshotQueries(() => page.goto("/reset-password"));
	await expect(page).toHaveTitle("RA - Reset password");
	await expect(page.locator("h2")).toHaveText("Something went wrong");
	await expect(page.locator("h3")).toHaveText(
		"Please verify you got reset link right or request a new one",
	);
});

test.describe("'resetPasswordIntentions.get' query", () => {
	test("loading", async ({ page, api, snapshotQueries, faker, skeleton }) => {
		// eslint-disable-next-line playwright/no-skipped-test
		test.skip(
			true,
			"We prefetch this query completely so loading state will hang it forever",
		);
		const token = faker.string.uuid();
		const getIntentionsPause = api.createPause();
		api.mockFirst("resetPasswordIntentions.get", async ({ next }) => {
			await getIntentionsPause.promise;
			return next();
		});
		await snapshotQueries(
			async () => {
				await page.goto(`/reset-password?token=${token}`);
				await expect(skeleton).toBeVisible();
			},
			{ name: "query-loading" },
		);
		await expect(page).toHaveURL(`/reset-password?token=${token}`);
	});

	test("error", async ({
		page,
		api,
		snapshotQueries,
		faker,
		errorMessage,
		consoleManager,
	}) => {
		const token = faker.string.uuid();
		const rawErrorMessage = "Mock 'resetPasswordIntentions.get' error";
		consoleManager.ignore(new RegExp(`TRPCClientError: ${rawErrorMessage}`));
		api.mockFirst("resetPasswordIntentions.get", async () => {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: rawErrorMessage,
			});
		});
		await snapshotQueries(
			async () => {
				await page.goto(`/reset-password?token=${token}`);
				await expect(errorMessage(rawErrorMessage)).toBeVisible();
			},
			{ name: "error" },
		);
		await expect(page).toHaveURL(`/reset-password?token=${token}`);
	});

	test("success", async ({ page, api, snapshotQueries, faker }) => {
		const token = faker.string.uuid();
		const email = faker.internet.email();
		api.mockFirst("resetPasswordIntentions.get", { email });
		await snapshotQueries(
			async () => {
				await page.goto(`/reset-password?token=${token}`);
				await expect(page.locator("h3")).toHaveText(email);
			},
			{ name: "success", blacklistKeys: ["receipts.getPaged"] },
		);
		await expect(page).toHaveURL(`/reset-password?token=${token}`);
	});
});

test.describe("'auth.resetPassword' mutation", () => {
	test("loading", async ({
		page,
		api,
		snapshotQueries,
		faker,
		withLoader,
		resetPasswordButton,
		fillValidFields,
	}) => {
		api.mockFirst("resetPasswordIntentions.get", {
			email: faker.internet.email(),
		});
		const token = faker.string.uuid();
		const resetPasswordPause = api.createPause();
		api.mockFirst("auth.resetPassword", async ({ next }) => {
			await resetPasswordPause.promise;
			return next();
		});
		await page.goto(`/reset-password?token=${token}`);
		await fillValidFields();
		await snapshotQueries(
			async () => {
				await resetPasswordButton.click();
				await expect(withLoader(page.getByRole("button"))).toBeVisible();
			},
			{ name: "loading" },
		);
		await expect(page).toHaveURL(`/reset-password?token=${token}`);
	});

	test("error", async ({
		page,
		api,
		snapshotQueries,
		verifyToastTexts,
		faker,
		errorMessage,
		fillValidFields,
		resetPasswordButton,
	}) => {
		api.mockFirst("resetPasswordIntentions.get", {
			email: faker.internet.email(),
		});
		const token = faker.string.uuid();
		const rawErrorMessage = "Mock 'auth.resetPassword' error";
		api.mockFirst("auth.resetPassword", async () => {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: rawErrorMessage,
			});
		});
		await page.goto(`/reset-password?token=${token}`);
		await fillValidFields();
		await snapshotQueries(
			async () => {
				await resetPasswordButton.click();
				await expect(errorMessage(rawErrorMessage)).toBeVisible();
				await verifyToastTexts(`Password reset failed: ${rawErrorMessage}`);
			},
			{ name: "error" },
		);
		await expect(page).toHaveURL(`/reset-password?token=${token}`);
	});

	test("success", async ({
		page,
		api,
		snapshotQueries,
		verifyToastTexts,
		faker,
		resetPasswordButton,
		fillValidFields,
	}) => {
		api.mockFirst("resetPasswordIntentions.get", {
			email: faker.internet.email(),
		});
		api.mockFirst("auth.resetPassword", undefined);
		await page.goto(`/reset-password?token=${faker.string.uuid()}`);
		await fillValidFields();
		await snapshotQueries(
			async () => {
				await api.mockUtils.authPage({ page });
				await resetPasswordButton.click();
				await verifyToastTexts("Password successfully reset");
			},
			{ name: "success" },
		);
		await expect(page).toHaveURL("/login");
	});
});

test.describe("form", () => {
	test("invalid fields", async ({
		page,
		api,
		faker,
		resetPasswordButton,
		fillInvalidFields,
		fields,
	}) => {
		api.mockFirst("resetPasswordIntentions.get", {
			email: faker.internet.email(),
		});
		await page.goto(`/reset-password?token=${faker.string.uuid()}`);
		await fillInvalidFields();
		await expect(
			page
				.locator('[data-slot="base"]', { has: fields.password })
				.locator('[data-slot="description"]'),
		).toHaveText("Minimal length for password is 6");
		await expect(
			page
				.locator('[data-slot="base"]', { has: fields.passwordRetype })
				.locator('[data-slot="description"]'),
		).toHaveText("Minimal length for password is 6\nPasswords don't match");
		await expect(resetPasswordButton).toBeDisabled();
	});
});
