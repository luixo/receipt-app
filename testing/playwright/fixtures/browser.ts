import type { Cookie } from "@playwright/test";
import { test } from "@playwright/test";

import type { StoreValues } from "~app/utils/store-data";

type CookieManager = {
	addCookie: <K extends keyof StoreValues>(
		name: K,
		value: StoreValues[K],
	) => Promise<void>;
	getCookie: <K extends keyof StoreValues>(
		name: K,
	) => Promise<(Omit<Cookie, "value"> & { value: StoreValues[K] }) | undefined>;
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

			getCookie: async (name) => {
				const cookies = await browserContext.cookies();
				const cookie = cookies.find(
					(cookieLookup) => cookieLookup.name === name,
				);
				if (cookie === undefined) {
					return undefined;
				}
				const { value, ...rest } = cookie;
				return {
					...rest,
					value: value as StoreValues[typeof name],
				};
			},
		});
	},
});
