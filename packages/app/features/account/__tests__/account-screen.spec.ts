import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test.describe("Avatar", () => {
	test.describe("editor open", () => {
		test.beforeEach(async ({ mockBase, page, avatarButton }) => {
			await mockBase();
			await page.goto("/account");
			await avatarButton.click();
		});

		test("user can upload an avatar", async ({
			api,
			saveAvatarButton,
			snapshotQueries,
			awaitCacheKey,
			verifyToastTexts,
			faker,
			uploadTestImage,
		}) => {
			api.mockFirst("account.changeAvatar", { url: faker.image.url() });

			await uploadTestImage();
			await expect(saveAvatarButton).toBeEnabled();

			await snapshotQueries(async () => {
				await saveAvatarButton.click();
				await awaitCacheKey("account.changeAvatar");
				await verifyToastTexts();
			});
		});

		test("user can close avatar editor", async ({
			avatarButton,
			closeAvatarEditorButton,
			saveAvatarButton,
		}) => {
			await expect(closeAvatarEditorButton).toBeVisible();
			await expect(saveAvatarButton).toBeVisible();

			await closeAvatarEditorButton.click();

			await expect(closeAvatarEditorButton).toBeHidden();
			await expect(saveAvatarButton).toBeHidden();
			await expect(avatarButton).toBeVisible();
		});

		test("user can zoom in avatar", async ({
			zoomSlider,
			changeSlider,
			uploadTestImage,
		}) => {
			await uploadTestImage();
			await expect(zoomSlider).toBeVisible();

			const initialValue = await zoomSlider.evaluate(
				(el) => (el as HTMLInputElement).value,
			);

			await changeSlider(zoomSlider, 0.6, "height");

			const newValue = await zoomSlider.evaluate(
				(el) => (el as HTMLInputElement).value,
			);
			expect(Number(newValue)).toBeGreaterThan(Number(initialValue));
		});
	});

	test("user can remove an avatar", async ({
		page,
		api,
		mockBase,
		avatarButton,
		removeAvatarButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
		faker,
	}) => {
		await mockBase({ avatarUrl: faker.image.url() });
		api.mockFirst("account.changeAvatar", undefined);

		await page.goto("/account");
		await avatarButton.click();
		await expect(removeAvatarButton).toBeVisible();

		await removeAvatarButton.click();

		const dialog = page.getByRole("dialog", { name: /Are you sure/ });
		await expect(dialog).toBeVisible();

		const yesButton = dialog.getByRole("button", { name: "Yes" });
		const noButton = dialog.getByRole("button", { name: "No" });
		await expect(yesButton).toBeVisible();
		await expect(noButton).toBeVisible();

		// "No" closes the dialog without triggering any mutation
		await snapshotQueries(async () => {
			await noButton.click();
			await expect(dialog).toBeHidden();
		});

		// Reopen and confirm removal
		await removeAvatarButton.click();
		await expect(dialog).toBeVisible();

		await snapshotQueries(async () => {
			await yesButton.click();
			await awaitCacheKey("account.changeAvatar");
			await verifyToastTexts();
		});
	});
});

test.describe("Password change", () => {
	test.beforeEach(async ({ mockBase, page, changePasswordShowButton }) => {
		await mockBase();
		await page.goto("/account");
		await changePasswordShowButton.click();
	});

	test.describe("Invalid form disables submit button", () => {
		test("on empty fields", async ({ submitPasswordButton }) => {
			await expect(submitPasswordButton).toBeDisabled();
		});

		test("on only prevPassword filled", async ({
			prevPasswordField,
			submitPasswordButton,
		}) => {
			await prevPasswordField.fill("strong-password");
			await expect(submitPasswordButton).toBeDisabled();
		});

		test("on valid prevPassword and password but empty retype", async ({
			prevPasswordField,
			passwordField,
			submitPasswordButton,
		}) => {
			await prevPasswordField.fill("strong-password");
			await passwordField.fill("new-password-123");
			await expect(submitPasswordButton).toBeDisabled();
		});

		test("on mismatched passwords", async ({
			prevPasswordField,
			passwordField,
			passwordRetypeField,
			submitPasswordButton,
		}) => {
			await prevPasswordField.fill("strong-password");
			await passwordField.fill("new-password-123");
			await passwordRetypeField.fill("different-password-456");
			await expect(submitPasswordButton).toBeDisabled();
		});

		test("on too short password", async ({
			prevPasswordField,
			passwordField,
			passwordRetypeField,
			submitPasswordButton,
		}) => {
			await prevPasswordField.fill("short");
			await passwordField.fill("short");
			await passwordRetypeField.fill("short");
			await expect(submitPasswordButton).toBeDisabled();
		});
	});

	test("'account.changePassword' mutation", async ({
		api,
		prevPasswordField,
		passwordField,
		passwordRetypeField,
		submitPasswordButton,
		snapshotQueries,
		awaitCacheKey,
		verifyToastTexts,
		withLoader,
	}) => {
		api.mockFirst("account.changePassword", () => {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: `Mock "account.changePassword" error`,
			});
		});

		await prevPasswordField.fill("current-password-123");
		await passwordField.fill("new-strong-password-456");
		await passwordRetypeField.fill("new-strong-password-456");
		await expect(submitPasswordButton).toBeEnabled();

		await snapshotQueries(async () => {
			await submitPasswordButton.click();
			await awaitCacheKey("account.changePassword", { errored: 1 });
			await verifyToastTexts(
				`Error changing password: Mock "account.changePassword" error`,
			);
		});

		// Form retains values after error — no need to re-fill
		const pause = api.createPause();
		api.mockFirst("account.changePassword", async () => {
			await pause.promise;
		});
		const buttonWithLoader = withLoader(submitPasswordButton);
		await expect(buttonWithLoader).toBeHidden();

		await snapshotQueries(
			async () => {
				await submitPasswordButton.click();
				await verifyToastTexts();
			},
			{ name: "loading" },
		);
		await expect(submitPasswordButton).toBeDisabled();
		await expect(buttonWithLoader).toBeVisible();

		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("account.changePassword");
				await verifyToastTexts();
			},
			{ name: "success", skipQueries: true },
		);
	});
});

test("'account.logout' mutation", async ({
	page,
	api,
	mockBase,
	logoutButton,
	snapshotQueries,
	awaitCacheKey,
	verifyToastTexts,
	withLoader,
}) => {
	await mockBase();
	api.mockFirst("account.logout", () => {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Mock "account.logout" error`,
		});
	});
	await page.goto("/account");

	await snapshotQueries(async () => {
		await logoutButton.click();
		await awaitCacheKey("account.logout", { errored: 1 });
		await verifyToastTexts(`Logout failed: Mock "account.logout" error`);
	});
	await expect(page).toHaveURL("/account");

	api.mockUtils.noAuthPage();
	const pause = api.createPause();
	api.mockFirst("account.logout", async () => {
		await pause.promise;
	});
	const buttonWithLoader = withLoader(logoutButton);
	await expect(buttonWithLoader).toBeHidden();

	await snapshotQueries(
		async () => {
			await logoutButton.click();
			await verifyToastTexts();
		},
		{ name: "loading" },
	);
	await expect(logoutButton).toBeDisabled();
	await expect(buttonWithLoader).toBeVisible();

	await snapshotQueries(
		async () => {
			pause.resolve();
			await awaitCacheKey("account.logout");
			await verifyToastTexts("Logout successful, redirecting..");
		},
		{
			name: "success",
			skipQueries: true,
			blacklistKeys: "receipts.getPaged",
		},
	);
	await expect(page).toHaveURL("/receipts");
});
