import type { Locator } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { DESCRIPTION_CLASSNAME } from "~utils/toast";

const DEFAULT_WAIT_TOAST_TIMEOUT = 1000;

type ToastsFixtures = {
	toast: Locator;
	verifyToastTexts: (
		textOrTexts?: string | string[],
		timeout?: number,
	) => Promise<void>;
	clearToasts: () => Promise<void>;
};

export const toastsFixtures = test.extend<ToastsFixtures>({
	toast: ({ page }, use) => use(page.getByRole("alertdialog")),
	verifyToastTexts: async ({ clearToasts, toast }, use) => {
		// Every toast is shown for at least 1 second
		await use(
			async (textOrTexts = [], timeout = DEFAULT_WAIT_TOAST_TIMEOUT) => {
				await expect(async () => {
					const textsArray = Array.isArray(textOrTexts)
						? textOrTexts
						: [textOrTexts];

					if (textsArray.length > 4) {
						throw new Error(
							"Currently, only 4 toasts are visible at the moment, please create a test with less toasts",
						);
					}
					const expectedTexts = textsArray.sort((a, b) => a.localeCompare(b));
					const actualTexts = (
						await toast.locator(`.${DESCRIPTION_CLASSNAME}`).allInnerTexts()
					).sort((a, b) => a.localeCompare(b));
					expect(actualTexts, {
						message: `Expected to have length of ${
							expectedTexts.length
						} for toast messages.${
							actualTexts.length !== 0
								? `\nGot actually:\n${actualTexts.join("\n")}`
								: ""
						}`,
					}).toHaveLength(expectedTexts.length);
					expectedTexts.forEach((expectedText, index) => {
						const actualText = actualTexts[index];
						expect(actualText, {
							message: `Expected to have "${expectedText.toString()}" at index ${index}, got "${actualText}"`,
						}).toMatch(expectedText);
					});
				}).toPass({ timeout, intervals: [100] });
				await clearToasts();
			},
		);
	},
	clearToasts: async ({ page, toast }, use) => {
		await use(() =>
			expect
				.poll(async () => {
					await page.evaluate(() => {
						if (!window.removeToasts) {
							return;
						}
						window.removeToasts();
					});
					return toast.count();
				})
				.toBe(0),
		);
	},
});
