import type { Locator } from "@playwright/test";
import { expect, test } from "@playwright/test";

type TooltipFixtures = {
	expectTooltip: (locator: Locator, expectedText: string) => Promise<void>;
};

export const tooltipFixtures = test.extend<TooltipFixtures>({
	expectTooltip: async ({ page }, use) =>
		use(async (locator, expectedText) => {
			// see https://github.com/adobe/react-spectrum/issues/5701
			await page.mouse.click(0, 0);
			await locator.hover();
			await expect(page.locator("[role='tooltip']")).toHaveText(expectedText);
		}),
});
