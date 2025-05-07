import { expect, test } from "@playwright/test";

const TOAST_SELECTOR = ".toaster > div";
const DEFAULT_WAIT_TOAST_TIMEOUT = 1000;

type ToastsFixtures = {
	verifyToastTexts: (
		textOrTexts?: string | string[],
		timeout?: number,
	) => Promise<void>;
	clearToasts: () => Promise<void>;
};

export const toastsFixtures = test.extend<ToastsFixtures>({
	verifyToastTexts: async ({ page, clearToasts }, use) => {
		// Every toast is shown for at least 1 second
		await use(
			async (textOrTexts = [], timeout = DEFAULT_WAIT_TOAST_TIMEOUT) => {
				await expect(async () => {
					const expectedTexts = (
						Array.isArray(textOrTexts) ? textOrTexts : [textOrTexts]
					).sort((a, b) => a.localeCompare(b));
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
				}).toPass({ timeout, intervals: [100] });
				await clearToasts();
			},
		);
	},
	clearToasts: async ({ page }, use) => {
		await use(() =>
			expect
				.poll(async () => {
					await page.evaluate(() => {
						if (!window.removeToasts) {
							return;
						}
						window.removeToasts();
					});
					return page.locator(TOAST_SELECTOR).count();
				})
				.toBe(0),
		);
	},
});
