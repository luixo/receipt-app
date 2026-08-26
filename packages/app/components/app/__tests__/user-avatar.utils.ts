import { type Locator, test as originalTest } from "@playwright/test";

export type Fixtures = {
	userAvatar: Locator;
	userAvatarSkeleton: Locator;
	mockAvatar: string;
};

const MOCK_AVATAR_URL =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export const test = originalTest.extend<Fixtures>({
	userAvatar: ({ page }, use) => use(page.getByTestId("user-avatar")),
	userAvatarSkeleton: ({ page }, use) =>
		use(page.getByTestId("user-avatar-skeleton")),
	mockAvatar: ({}, use) => use(MOCK_AVATAR_URL),
});
