import { test } from "@playwright/test";

import type { StoreValues } from "~app/utils/store-data";

type CookieManager = {
	addCookie: <K extends keyof StoreValues>(
		name: K,
		value: StoreValues[K],
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
