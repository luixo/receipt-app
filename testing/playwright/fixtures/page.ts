import { expect } from "@playwright/test";
import type { Page as OriginalPage, Page } from "@playwright/test";

import type { NavigationOptions, RouteTo } from "~app/utils/navigation";
import type { ExtractFixture } from "~tests/frontend/types";
import { apiCookieNames } from "~utils/mocks";
import { buildUrl } from "~utils/server/url";

import { apiFixtures as test } from "./api";

type RoutedPage = OriginalPage & {
	navigate: <K extends RouteTo>(
		target: NavigationOptions<K>,
		options?: Parameters<Page["goto"]>[1],
	) => ReturnType<OriginalPage["goto"]>;
	expectUrl: <K extends RouteTo>(
		target: NavigationOptions<K>,
		options?: Parameters<
			ReturnType<typeof expect<OriginalPage>>["toHaveURL"]
		>[1],
	) => Promise<void>;
};

export const setProxyHeaders = async (
	page: Page,
	api: ExtractFixture<typeof test>["api"],
	baseUrl = "",
) => {
	const { url, controllerId } = api.getConnection();
	await page.context().addCookies([
		{
			name: apiCookieNames.proxyPort,
			value: url.port,
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
	// One of the places this is allowed
	// oxlint-disable-next-line eslint-js/no-restricted-syntax
	const localMockedTimestamp = Date.now();
	await page.addInitScript<[number]>(
		([mockedTimestamp]) => {
			Date.now = () => mockedTimestamp;
			// That's basically a copy of `testing/utils/src/temporal-freeze.ts`
			const instant = () =>
				Temporal.Instant.fromEpochMilliseconds(mockedTimestamp);
			const zonedDateTime = () =>
				instant().toZonedDateTimeISO(Temporal.Now.timeZoneId());
			Temporal.Now.instant = instant;
			Temporal.Now.zonedDateTimeISO = zonedDateTime;
			Temporal.Now.plainDateTimeISO = () => zonedDateTime().toPlainDateTime();
			Temporal.Now.plainDateISO = () => zonedDateTime().toPlainDate();
			Temporal.Now.plainTimeISO = () => zonedDateTime().toPlainTime();
			// oxlint-disable-next-line no-implicit-globals no-global-assign
			Date = class extends Date {
				// Browser may crumble with an extra member accessibility parameter
				// oxlint-disable-next-line typescript/explicit-member-accessibility
				constructor(...args: Parameters<DateConstructor>) {
					// see https://github.com/microsoft/TypeScript/issues/32164
					// oxlint-disable-next-line typescript/no-unnecessary-condition
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

export const pageFixtures = test.extend<{ page: RoutedPage }>({
	page: async ({ page, javaScriptEnabled, api, baseURL }, use, testInfo) => {
		const routedPage = page;
		await page.emulateMedia({ colorScheme: "light" });

		const pageAfterEach = async () => {
			if (javaScriptEnabled) {
				await page.locator("hydrated").waitFor({ state: "attached" });
				// Remove rounding for dialogs to make screenshots more stable
				await page.addStyleTag({
					content: '[role="dialog"] { border-radius: 0 !important }',
				});
			}
		};

		await page.setExtraHTTPHeaders({ "x-test-id": testInfo.testId });
		routedPage.navigate = async (target, options) => {
			await fakeBrowserDate(page);
			await setProxyHeaders(page, api, baseURL);
			// We wait for page stream to end while simultaneously hang requests in "loading" state
			// So we consider page to be loaded when page is started loading and wait for `hydrated` mark
			// oxlint-disable-next-line eslint-js/no-restricted-syntax
			const result = page.goto(buildUrl(target), {
				waitUntil: javaScriptEnabled ? "commit" : "load",
				...options,
			});
			await pageAfterEach();
			return result;
		};
		routedPage.expectUrl = async (target, options) => {
			// This is the only place it can be used
			// oxlint-disable-next-line eslint-js/no-restricted-syntax
			await expect(page).toHaveURL(buildUrl(target), options);
		};
		const originalReload = page.reload.bind(page);
		routedPage.reload = async (options) => {
			const result = await originalReload(options);
			await pageAfterEach();
			return result;
		};

		await use(routedPage);
	},
});
