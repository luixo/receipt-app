import type { Page as OriginalPage, Page } from "@playwright/test";

import type { ExtractFixture } from "~tests/frontend/types";

import { apiFixtures as test } from "./api";

type ExtendedPageFixtures = { page: Page };

const getProxyUrl = (url: string, api: ExtractFixture<typeof test>["api"]) => {
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
					// see https://github.com/microsoft/TypeScript/issues/32164
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

export const pageFixtures = test.extend<ExtendedPageFixtures>({
	page: async ({ page, api }, use) => {
		await page.emulateMedia({ colorScheme: "light" });

		const originalGoto = page.goto.bind(page);
		page.goto = async (url, options) => {
			const result = await originalGoto(getProxyUrl(url, api), options);
			await fakeBrowserDate(page);
			await page.locator("hydrated").waitFor({ state: "attached" });
			// Remove rounding for dialogs to make screenshots more stable
			await page.addStyleTag({
				content: '[role="dialog"] { border-radius: 0 !important }',
			});
			return result;
		};

		await use(page);
	},
});
