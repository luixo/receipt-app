import type { Locator } from "@playwright/test";

import { test as originalTest } from "./utils";

type Fixtures = {
	// The trigger button is icon-only with no accessible name of its own,
	// so it's scoped to the page header's aside slot instead.
	acceptIntentionButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	acceptIntentionButton: ({ page }, use) =>
		use(page.getByTestId("header-aside").getByRole("button")),
});
