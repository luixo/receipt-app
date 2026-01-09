import type { Locator } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { getNow } from "~utils/date";
import { DESCRIPTION_CLASSNAME } from "~utils/toast";

const DEFAULT_WAIT_TOAST_TIMEOUT = 1000;
const SKIP_TOAST_TIMEOUT = 5000;

type ToastsFixtures = {
	toast: Locator;
	verifyToastTexts: (
		textOrTexts?: string | string[],
		timeout?: number,
	) => Promise<void>;
	clearToasts: (amount?: number) => Promise<void>;
};

export const toastsFixtures = test.extend<ToastsFixtures>({
	toast: ({ page }, use) => use(page.getByRole("alertdialog")),
	verifyToastTexts: async ({ clearToasts, toast }, use) => {
		// Every toast is shown for at least 1 second
		await use(
			async (textOrTexts = [], timeout = DEFAULT_WAIT_TOAST_TIMEOUT) => {
				const textsArray = Array.isArray(textOrTexts)
					? textOrTexts
					: [textOrTexts];

				if (textsArray.length > 4) {
					throw new Error(
						"Currently, only 4 toasts are visible at the moment, please create a test with less toasts",
					);
				}
				const expectedTexts = textsArray.toSorted((a, b) => a.localeCompare(b));

				await expect(async () => {
					const actualTexts = await toast
						.locator(`.${DESCRIPTION_CLASSNAME}`)
						.allInnerTexts();
					const sortedActualTexts = actualTexts.toSorted((a, b) =>
						a.localeCompare(b),
					);
					expect(sortedActualTexts, {
						message: `Expected to have length of ${
							expectedTexts.length
						} for toast messages.${
							sortedActualTexts.length !== 0
								? `\nGot actually:\n${sortedActualTexts.join("\n")}`
								: ""
						}`,
					}).toHaveLength(expectedTexts.length);
					expectedTexts.forEach((expectedText, index) => {
						const actualText = sortedActualTexts[index];
						expect(actualText, {
							message: `Expected to have "${expectedText.toString()}" at index ${index}, got "${actualText}"`,
						}).toMatch(expectedText);
					});
				}).toPass({ timeout, intervals: [100] });
				await clearToasts(textsArray.length);
			},
		);
	},
	clearToasts: async ({ page, toast }, use) => {
		await use(async (amount = 1) => {
			if (amount === 0) {
				return;
			}
			let toastsLeft = amount;
			const startTimestamp = getNow.plainDateTime();
			await expect(async () => {
				const toastCount = await toast.count();
				if (toastCount !== 0) {
					const removeToastsAmount = await page.evaluate(() => {
						if (!window.removeToasts) {
							throw new Error("Expected to have window.remoteToasts");
						}
						return window.removeToasts();
					});
					toastsLeft -= removeToastsAmount;
					if (toastsLeft === 0) {
						return;
					}
				}
				if (toastsLeft < 0) {
					throw new Error(
						`There were extra ${-toastsLeft} toasts found, please fix the test.`,
					);
				}
				if (
					getNow.plainDateTime().compare(startTimestamp) > SKIP_TOAST_TIMEOUT
				) {
					// This is for flaky browsers that tend to miss a toast or two
					return;
				}
				throw new Error(`Expected to have ${toastsLeft} more toasts.`);
			}).toPass();
			await expect.poll(() => toast.count()).toEqual(0);
		});
	},
});
