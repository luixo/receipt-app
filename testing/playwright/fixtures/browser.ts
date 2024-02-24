import type { CookieValues } from "app/utils/cookie-data";

import { createMixin } from "./utils";

type CookieManager = {
	addCookie: <K extends keyof CookieValues>(
		name: K,
		value: CookieValues[K],
	) => void;
};

type BrowserMixin = {
	cookieManager: CookieManager;
};

export const browserMixin = createMixin<BrowserMixin>({
	cookieManager: async ({ page, baseURL }, use) => {
		const browserContext = page.context();
		await use({
			addCookie: async (name, value) => {
				await browserContext.addCookies([
					{
						name,
						value: JSON.stringify(value),
						url: baseURL,
					},
				]);
			},
		});
	},
});
