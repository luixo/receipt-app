import { test } from "@playwright/test";

import type { CookieValues } from "~app/utils/cookie-data";

type CookieManager = {
	addCookie: <K extends keyof CookieValues>(
		name: K,
		value: CookieValues[K],
	) => Promise<void>;
};

type BrowserFixtures = {
	cookieManager: CookieManager;
};

export const browserFixtures = test.extend<BrowserFixtures>({
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
