import type { Locator } from "@playwright/test";

import { createMixin } from "./utils";

type SelectorsMixin = {
	withLoader: (locator: Locator) => Locator;
};

export const selectorsMixin = createMixin<SelectorsMixin>({
	withLoader: async ({ page }, use) => {
		await use((locator) =>
			locator.filter({
				has: page.locator('[aria-label="Loading"]'),
			}),
		);
	},
});
