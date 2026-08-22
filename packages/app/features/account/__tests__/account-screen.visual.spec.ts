import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test.beforeEach(async ({ mockBase, page }) => {
	await mockBase();
	await page.goto("/account");
});

test("All panels hidden", async ({ page, expectScreenshotWithSchemes }) => {
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	await expectScreenshotWithSchemes("all-panels-hidden.png");
});

test("All panels open", async ({
	page,
	avatarButton,
	changePasswordShowButton,
	closeAvatarEditorButton,
	expectScreenshotWithSchemes,
}) => {
	await avatarButton.click();
	await expect(closeAvatarEditorButton).toBeVisible();
	await changePasswordShowButton.click();
	await expect(
		page.getByRole("textbox", { name: "Current password" }),
	).toBeVisible();
	await expectScreenshotWithSchemes("all-panels-open.png");
});

test("Avatar upload mutation loading state", async ({
	api,
	avatarButton,
	avatarForm,
	saveAvatarButton,
	expectScreenshotWithSchemes,
	faker,
	skip,
	uploadTestImage,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const pause = api.createPause();
	api.mockFirst("account.changeAvatar", async () => {
		await pause.promise;
		return { url: faker.image.url() };
	});
	await avatarButton.click();
	await uploadTestImage();
	await expect(saveAvatarButton).toBeEnabled();
	await saveAvatarButton.click();
	await expect(saveAvatarButton).toBeDisabled();
	await expectScreenshotWithSchemes("avatar-upload-loading.png", {
		locator: avatarForm,
	});
	pause.resolve();
});

test("Password form with errors", async ({
	changePasswordShowButton,
	prevPasswordField,
	passwordField,
	passwordRetypeField,
	passwordForm,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	await changePasswordShowButton.click();
	await prevPasswordField.fill("short");
	await prevPasswordField.blur();
	await passwordField.fill("new-password-123");
	await passwordField.blur();
	await passwordRetypeField.fill("different-password-456");
	await passwordRetypeField.blur();
	await expectScreenshotWithSchemes("password-form-errors.png", {
		locator: passwordForm,
	});
});

test("Logout button loading state", async ({
	api,
	logoutButton,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	api.mockUtils.noAuthPage();
	const pause = api.createPause();
	api.mockFirst("account.logout", async () => {
		await pause.promise;
	});
	await logoutButton.click();
	await expect(logoutButton).toBeDisabled();
	await expectScreenshotWithSchemes("logout-loading.png", {
		locator: logoutButton,
	});
	pause.resolve();
});
