import type { Locator } from "@playwright/test";

import { test as originalTest } from "~tests/frontend/fixtures";
import type { ExtractFixture } from "~tests/frontend/types";

// 1×1 transparent PNG — small enough to keep tests fast, valid enough for react-easy-crop
const TEST_IMAGE_DATA_URL =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

type AuthPageResult = Awaited<
	ReturnType<
		ExtractFixture<typeof originalTest>["api"]["mockUtils"]["authPage"]
	>
>;

type Fixtures = {
	mockBase: (options?: { avatarUrl?: string }) => Promise<AuthPageResult>;
	uploadTestImage: () => Promise<void>;
	logoutButton: Locator;
	avatarButton: Locator;
	avatarForm: Locator;
	passwordForm: Locator;
	closeAvatarEditorButton: Locator;
	removeAvatarButton: Locator;
	saveAvatarButton: Locator;
	resetAvatarButton: Locator;
	zoomSlider: Locator;
	fileInput: Locator;
	changePasswordShowButton: Locator;
	prevPasswordField: Locator;
	passwordField: Locator;
	passwordRetypeField: Locator;
	submitPasswordButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, page }, use) =>
		use(async ({ avatarUrl } = {}) => {
			const auth = await api.mockUtils.authPage({ page });
			if (avatarUrl !== undefined) {
				api.mockFirst("account.get", {
					account: { ...auth.account, avatarUrl },
					user: { name: auth.user.name },
				});
			}
			return auth;
		}),

	uploadTestImage: ({ fileInput }, use) =>
		use(async () => {
			const base64Data = TEST_IMAGE_DATA_URL.split(",")[1] ?? "";
			await fileInput.setInputFiles({
				name: "avatar.png",
				mimeType: "image/png",
				buffer: Buffer.from(base64Data, "base64"),
			});
		}),

	logoutButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Logout" })),

	avatarButton: ({ page }, use) => use(page.getByTestId("avatar-button")),

	avatarForm: ({ page }, use) => use(page.getByTestId("avatar-form")),

	passwordForm: ({ page }, use) => use(page.getByTestId("password-form")),

	closeAvatarEditorButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Close avatar editor" })),

	removeAvatarButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Remove avatar" })),

	saveAvatarButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Save avatar" })),

	resetAvatarButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Reset avatar selection" })),

	zoomSlider: ({ page }, use) =>
		use(page.getByRole("slider", { name: "Change scale" })),

	fileInput: ({ page }, use) => use(page.locator("input[type=file]")),

	changePasswordShowButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Change password" })),

	prevPasswordField: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Current password" })),

	passwordField: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "New password", exact: true })),

	passwordRetypeField: ({ page }, use) =>
		use(page.getByRole("textbox", { name: "Retype new password" })),

	submitPasswordButton: ({ page }, use) =>
		use(page.locator("button[type=submit]", { hasText: "Change password" })),
});
