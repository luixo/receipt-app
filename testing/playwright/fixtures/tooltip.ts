import type { Locator } from "@playwright/test";
import { expect } from "@playwright/test";

import { createMixin } from "./utils";

type TooltipMixin = {
	expectTooltip: (locator: Locator, expectedText: string) => Promise<void>;
};

export const tooltipMixin = createMixin<TooltipMixin>({
	expectTooltip: async ({ page }, use) =>
		use(async (locator, expectedText) => {
			// see https://github.com/adobe/react-spectrum/issues/5701
			await page.mouse.click(0, 0);
			await locator.hover();
			await expect(page.locator("[role='tooltip']")).toHaveText(expectedText);
		}),
});
