import type { Locator } from "@playwright/test";

import { createMixin } from "./utils";

type SelectorsMixin = {
	withLoader: (locator: Locator) => Locator;
	modal: (title: string) => Locator;
};

export const selectorsMixin = createMixin<SelectorsMixin>({
	withLoader: async ({ page }, use) => {
		await use((locator) =>
			locator.filter({
				has: page.locator('[aria-label="Loading"]'),
			}),
		);
	},
	modal: async ({ page }, use) => {
		await use((title) => page.locator(`section[title='${title}']`));
	},
});
