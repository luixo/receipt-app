import type { Locator } from "@playwright/test";

import { test as originalTest } from "./utils";

type Fixtures = {
	acceptAllIntentionButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	acceptAllIntentionButton: ({ page }, use) =>
		use(page.locator("button[title='Accept all intentions']")),
});
