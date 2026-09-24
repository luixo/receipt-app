import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Card is hidden when  user is verified", async ({
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
			await page.navigate({ to: "/user" });
			await awaitCacheKey("user.get");
		},
		{ whitelistKeys: ["user.get"] },
	);

	await expect(emailVerificationCard).not.toBeAttached();
	await expect(resendButton).not.toBeAttached();
});

test("Card is shown when  user is unverified", async ({
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
			await page.navigate({ to: "/user" });
			await awaitCacheKey("user.get");
		},
		{ whitelistKeys: ["user.get"] },
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

test.describe("'user.resendEmail' mutation", () => {
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
		api.mockFirst("user.resendEmail", () => {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Mock "user.resendEmail" error`,
			});
		});
		await page.navigate({ to: "/user" });
		await expect(resendButton).toBeVisible();

		await snapshotQueries(
			async () => {
				await resendButton.click();
				await awaitCacheKey("user.resendEmail", { error: 1 });
				await verifyToastTexts(
					`Resend email failed: Mock "user.resendEmail" error`,
				);
			},
			{ whitelistKeys: ["user.get"] },
		);
		await page.expectUrl({ to: "/user" });

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
		const { user } = await mockBase();
		const resendPause = api.createPause();
		api.mockFirst("user.resendEmail", async () => {
			await resendPause.promise;
			return { email: user.email };
		});
		await page.navigate({ to: "/user" });
		await expect(resendButton).toBeVisible();

		const buttonWithLoader = withLoader(resendButton);
		await expect(buttonWithLoader).toBeHidden();

		await snapshotQueries(
			async () => {
				await resendButton.click();
				await expect(resendButton).toBeDisabled();
				await expect(buttonWithLoader).toBeVisible();
				await verifyToastTexts();
				await awaitCacheKey("user.resendEmail", { pending: 1 });
			},
			{ name: "loading", whitelistKeys: ["user.get"] },
		);

		await snapshotQueries(
			async () => {
				resendPause.resolve();
				await awaitCacheKey("user.resendEmail");
				await verifyToastTexts();
				await expect(resendButton).not.toBeAttached();
				await expect(emailVerificationCard).toContainText(
					`Email successfully sent to ${user.email}!`,
				);
			},
			{ name: "success", skipQueries: true, whitelistKeys: ["user.get"] },
		);
		await page.expectUrl({ to: "/user" });
	});
});
