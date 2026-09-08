import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Card is hidden when account is verified", async ({
	page,
	api,
	emailVerificationCard,
	resendButton,
	snapshotQueries,
}) => {
	await api.mockUtils.authPage({ page });

	await snapshotQueries(() => page.goto("/account"));

	await expect(emailVerificationCard).not.toBeAttached();
	await expect(resendButton).not.toBeAttached();
});

test("Card is shown when account is unverified", async ({
	page,
	mockUnverified,
	emailVerificationCard,
	resendButton,
	snapshotQueries,
}) => {
	await mockUnverified();

	await snapshotQueries(() => page.goto("/account"));

	await expect(emailVerificationCard).toBeVisible();
	await expect(emailVerificationCard).toContainText(
		"Your email is not verified!",
	);
	await expect(emailVerificationCard).toContainText(
		"Until you verify your email, you won't be able to use most of the app's features",
	);
	await expect(resendButton).toBeVisible();
	await expect(resendButton).toBeEnabled();
	await expect(resendButton).toHaveText("Resend email");
});

test.describe("'account.resendEmail' mutation", () => {
	test("error", async ({
		page,
		api,
		mockUnverified,
		emailVerificationCard,
		resendButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		await mockUnverified();
		api.mockFirst("account.resendEmail", () => {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Mock "account.resendEmail" error`,
			});
		});
		await page.goto("/account");
		await expect(resendButton).toBeVisible();

		await snapshotQueries(async () => {
			await resendButton.click();
			await awaitCacheKey("account.resendEmail", { error: 1 });
			await verifyToastTexts(
				`Resend email failed: Mock "account.resendEmail" error`,
			);
		});
		await expect(page).toHaveURL("/account");

		await expect(emailVerificationCard).toBeVisible();
		await expect(resendButton).toBeVisible();
		await expect(resendButton).toBeEnabled();
	});

	test("loading and success", async ({
		page,
		api,
		mockUnverified,
		emailVerificationCard,
		resendButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
		withLoader,
		faker,
	}) => {
		const { account } = await mockUnverified();
		const resentEmail = account.email || faker.internet.email();
		const resendPause = api.createPause();
		api.mockFirst("account.resendEmail", async () => {
			await resendPause.promise;
			return { email: resentEmail };
		});
		await page.goto("/account");
		await expect(resendButton).toBeVisible();

		const buttonWithLoader = withLoader(resendButton);
		await expect(buttonWithLoader).toBeHidden();

		await snapshotQueries(
			async () => {
				await resendButton.click();
				await expect(resendButton).toBeDisabled();
				await expect(buttonWithLoader).toBeVisible();
				await verifyToastTexts();
				await awaitCacheKey("account.resendEmail", { pending: 1 });
			},
			{ name: "loading" },
		);

		await snapshotQueries(
			async () => {
				resendPause.resolve();
				await awaitCacheKey("account.resendEmail");
				await verifyToastTexts();
				await expect(resendButton).not.toBeAttached();
				await expect(emailVerificationCard).toContainText(
					`Email successfully sent to ${resentEmail}!`,
				);
			},
			{ name: "success", skipQueries: true },
		);
		await expect(page).toHaveURL("/account");
	});
});
