import { type Locator, test as originalTest } from "@playwright/test";

export type Fixtures = {
	user: Locator;
	userSkeleton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	user: ({ page }, use) => use(page.getByTestId("user")),
	userSkeleton: ({ page }, use) => use(page.getByTestId("user-skeleton")),
});
