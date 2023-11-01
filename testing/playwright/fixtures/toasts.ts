import { expect } from "@playwright/test";

import { createMixin } from "./utils";

const TOAST_SELECTOR = ".toaster > div";
const DEFAULT_WAIT_TOAST_TIMEOUT = 1000;

declare global {
	interface Window {
		dismissToasts: () => void;
	}
}

type ToastsMixin = {
	verifyToastTexts: (
		textOrTexts: string | string[],
		timeout?: number,
	) => Promise<void>;
	clearToasts: () => Promise<void>;
};

export const toastsMixin = createMixin<ToastsMixin>({
	verifyToastTexts: async ({ page }, use) => {
		await use((textOrTexts, timeout = DEFAULT_WAIT_TOAST_TIMEOUT) =>
			expect
				.poll(
					() =>
						page.evaluate(
							([selector]) =>
								Array.from(document.querySelectorAll(selector)).map((toast) =>
									toast instanceof HTMLDivElement ? toast.innerText : "unknown",
								),
							[TOAST_SELECTOR] as const,
						),
					// Every toast is shown for at least 1 second
					{ message: "Toast messages differ", timeout },
				)
				.toEqual(Array.isArray(textOrTexts) ? textOrTexts : [textOrTexts]),
		);
	},
	clearToasts: async ({ page }, use) => {
		await use(async () => {
			await page.evaluate(() => {
				if (!window.dismissToasts) {
					return;
				}
				window.dismissToasts();
			});
			await page.locator(TOAST_SELECTOR).waitFor({ state: "detached" });
		});
	},
});
