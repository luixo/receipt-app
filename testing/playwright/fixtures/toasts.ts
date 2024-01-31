import { expect } from "@playwright/test";

import { createMixin } from "./utils";

const TOAST_SELECTOR = ".toaster > div";
const DEFAULT_WAIT_TOAST_TIMEOUT = 1000;

type RegExpOrString = string | RegExp;

type ToastsMixin = {
	verifyToastTexts: (
		textOrTexts?: RegExpOrString | RegExpOrString[],
		timeout?: number,
	) => Promise<void>;
	clearToasts: (options?: { shouldAwait?: boolean }) => Promise<void>;
};

export const toastsMixin = createMixin<ToastsMixin>({
	verifyToastTexts: async ({ page }, use) => {
		// Every toast is shown for at least 1 second
		await use((textOrTexts = [], timeout = DEFAULT_WAIT_TOAST_TIMEOUT) =>
			expect(async () => {
				const expectedTexts = (
					Array.isArray(textOrTexts) ? textOrTexts : [textOrTexts]
				).sort();
				const actualTexts = await page.evaluate(
					([selector]) =>
						Array.from(document.querySelectorAll(selector))
							.map((toast) =>
								toast instanceof HTMLDivElement ? toast.innerText : "unknown",
							)
							.sort(),
					[TOAST_SELECTOR] as const,
				);
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
			}).toPass({ timeout, intervals: [100] }),
		);
	},
	clearToasts: async ({ page }, use) => {
		await use(async ({ shouldAwait } = {}) => {
			if (shouldAwait) {
				await expect
					.poll(() => page.locator(TOAST_SELECTOR).count())
					.not.toBe(0);
			}
			await page.evaluate(() => {
				if (!window.dismissToasts) {
					return;
				}
				window.dismissToasts();
			});
			await expect.poll(() => page.locator(TOAST_SELECTOR).count()).toBe(0);
		});
	},
});
