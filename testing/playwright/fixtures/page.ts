import type { Page as OriginalPage, Page } from "@playwright/test";

import type { ExtractFixture } from "~tests/frontend/types";
import { apiCookieNames } from "~utils/mocks";

import { apiFixtures as test } from "./api";

type ExtendedPageFixtures = { page: Page };

const setProxyHeaders = async (
	page: Page,
	api: ExtractFixture<typeof test>["api"],
	baseUrl = "",
) => {
	const { port, controllerId } = api.getConnection();
	await page.context().addCookies([
		{
			name: apiCookieNames.proxyPort,
			value: port.toString(),
			url: baseUrl,
		},
		{
			name: apiCookieNames.controllerId,
			value: controllerId,
			url: baseUrl,
		},
	]);
};

const fakeBrowserDate = async (page: OriginalPage) => {
	// eslint-disable-next-line no-restricted-syntax
	const localMockedTimestamp = Date.now();
	await page.addInitScript<[number]>(
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
	page: async ({ page, javaScriptEnabled, api, baseURL }, use) => {
		await page.emulateMedia({ colorScheme: "light" });

		const originalGoto = page.goto.bind(page);
		page.goto = async (url, options) => {
			await fakeBrowserDate(page);
			await setProxyHeaders(page, api, baseURL);
			// We wait for page stream to end while simultaneously hang requests in "loading" state
			// So we consider page to be loaded when page is started loading and wait for `hydrated` mark
			const result = await originalGoto(url, {
				waitUntil: javaScriptEnabled ? "commit" : "load",
				...options,
			});
			if (javaScriptEnabled) {
				await page.locator("hydrated").waitFor({ state: "attached" });
				// Remove rounding for dialogs to make screenshots more stable
				await page.addStyleTag({
					content: '[role="dialog"] { border-radius: 0 !important }',
				});
			}
			return result;
		};

		await use(page);
	},
});
