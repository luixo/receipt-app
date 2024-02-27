import type { Locator } from "@playwright/test";

import { createMixin } from "~tests/frontend/fixtures/utils";

export type Fixtures = {
	debtsGroup: Locator;
	debtsGroupElement: Locator;
};

export const withFixtures = createMixin<Fixtures>({
	debtsGroup: ({ page }, use) => use(page.getByTestId("debts-group")),
	debtsGroupElement: ({ page }, use) =>
		use(page.getByTestId("debts-group-element")),
});
