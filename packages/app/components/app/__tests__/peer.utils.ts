import { test as originalTest } from "@playwright/test";
import type { Locator } from "@playwright/test";

export type Fixtures = {
	peer: Locator;
	peerSkeleton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	peer: ({ page }, use) => use(page.getByTestId("peer")),
	peerSkeleton: ({ page }, use) => use(page.getByTestId("peer-skeleton")),
});
