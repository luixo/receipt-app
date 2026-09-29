import type { Locator } from "@playwright/test";

import { test as originalTest } from "#tests/frontend/fixtures.ts";

type Fixtures = {
	voidButton: Locator;
	cancelButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	voidButton: ({ page }, use) => use(page.locator("button[type=submit]")),
	cancelButton: ({ page }, use) =>
		use(page.locator("button").or(page.locator("a")).filter({ hasText: "No" })),
});
