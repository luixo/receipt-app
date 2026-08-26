import type { Locator } from "@playwright/test";

import { test as originalTest } from "./utils";

type Fixtures = {
	unlinkButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	unlinkButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Unlink user from email" })),
});
