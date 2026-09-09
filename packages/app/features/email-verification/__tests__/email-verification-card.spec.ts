import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Card is hidden when account is verified", async ({
	page,
	api,
	emailVerificationCard,
	resendButton,
	snapshotQueries,
	awaitCacheKey,
}) => {
	await api.mockUtils.authPage();

	await snapshotQueries(
		async () => {
			await page.navigate({ to: "/account" });
			await awaitCacheKey("account.get");
		},
		{ whitelistKeys: ["account.get"] },
	);

	await expect(emailVerificationCard).not.toBeAttached();
	await expect(resendButton).not.toBeAttached();
});

test("Card is shown when account is unverified", async ({
	page,
	mockBase,
	emailVerificationCard,
	resendButton,
	snapshotQueries,
	awaitCacheKey,
}) => {
	await mockBase();

	await snapshotQueries(
		async () => {
			await page.navigate({ to: "/account" });
			await awaitCacheKey("account.get");
		},
		{ whitelistKeys: ["account.get"] },
	);

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
		mockBase,
		emailVerificationCard,
		resendButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
	}) => {
		await mockBase();
		api.mockFirst("account.resendEmail", () => {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Mock "account.resendEmail" error`,
			});
		});
		await page.navigate({ to: "/account" });
		await expect(resendButton).toBeVisible();

		await snapshotQueries(
			async () => {
				await resendButton.click();
				await awaitCacheKey("account.resendEmail", { error: 1 });
				await verifyToastTexts(
					`Resend email failed: Mock "account.resendEmail" error`,
				);
			},
			{ whitelistKeys: ["account.get"] },
		);
		await page.expectUrl({ to: "/account" });

		await expect(emailVerificationCard).toBeVisible();
		await expect(resendButton).toBeVisible();
		await expect(resendButton).toBeEnabled();
	});

	test("loading and success", async ({
		page,
		api,
		mockBase,
		emailVerificationCard,
		resendButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
		withLoader,
	}) => {
		const { account } = await mockBase();
		const resendPause = api.createPause();
		api.mockFirst("account.resendEmail", async () => {
			await resendPause.promise;
			return { email: account.email };
		});
		await page.navigate({ to: "/account" });
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
			{ name: "loading", whitelistKeys: ["account.get"] },
		);

		await snapshotQueries(
			async () => {
				resendPause.resolve();
				await awaitCacheKey("account.resendEmail");
				await verifyToastTexts();
				await expect(resendButton).not.toBeAttached();
				await expect(emailVerificationCard).toContainText(
					`Email successfully sent to ${account.email}!`,
				);
			},
			{ name: "success", skipQueries: true, whitelistKeys: ["account.get"] },
		);
		await page.expectUrl({ to: "/account" });
	});
});
