import type { Page as OriginalPage } from "@playwright/test";

import type { ApiMixin } from "./api";
import { createMixin } from "./utils";

const getProxyUrl = (url: string, api: ApiMixin["api"]) => {
	const { port, controllerId } = api.getConnection();
	const baseUrl = "http://localhost";
	const urlObject = new URL(url, baseUrl);
	urlObject.searchParams.set("proxyPort", port.toString());
	urlObject.searchParams.set("controllerId", controllerId);
	return urlObject.toString().replace(baseUrl, "");
};

const fakeBrowserDate = async (page: OriginalPage) => {
	const localMockedTimestamp = new Date().valueOf();
	await page.evaluate<void, [number]>(
		([mockedTimestamp]) => {
			Date.now = () => mockedTimestamp;
			// eslint-disable-next-line no-global-assign
			Date = class extends Date {
				constructor(...args: Parameters<DateConstructor>) {
					if (args.length === 0) {
						super(mockedTimestamp);
					} else {
						super(...args);
					}
				}
			} as DateConstructor;
		},
		[localMockedTimestamp],
	);
};

export const pageMixin = createMixin<
	NonNullable<unknown>,
	NonNullable<unknown>,
	ApiMixin
>({
	page: async ({ page, api }, use) => {
		await page.emulateMedia({ colorScheme: "light" });

		const originalGoto = page.goto.bind(page);
		page.goto = async (url, options) => {
			const result = await originalGoto(getProxyUrl(url, api), options);
			await fakeBrowserDate(page);
			await page.locator("hydrated").waitFor({ state: "attached" });
			return result;
		};

		await use(page);
	},
});
