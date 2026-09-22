import { test as originalTest } from "@playwright/test";
import type { Locator } from "@playwright/test";

export type Fixtures = {
	peersSuggest: Locator;
	suggestInput: (label: string) => Locator;
	suggestOption: (name: string) => Locator;
};

export const test = originalTest.extend<Fixtures>({
	peersSuggest: ({ page }, use) => use(page.getByTestId("peers-suggest")),
	suggestInput: ({ page }, use) => use((label) => page.getByLabel(label)),
	suggestOption: ({ page }, use) =>
		use((name) => page.getByRole("option").filter({ hasText: name })),
});
