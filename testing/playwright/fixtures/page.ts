import type {
	Locator,
	Page as OriginalPage,
	PageScreenshotOptions,
} from "@playwright/test";

import type { ApiMixin } from "./api";
import { createMixin } from "./utils";

const FRAME_LENGTH = 33;
const STABLE_FRAME_COUNT = 5;

declare module "@playwright/test" {
	interface Page {
		stableScreenshot: (
			options?: PageScreenshotOptions & {
				stableDelay?: number;
				locator?: Locator;
			},
		) => Promise<Buffer>;
	}
}

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
	await page.evaluate(
		([mockedTimestamp]) => {
			Date.now = () => mockedTimestamp!;
			// eslint-disable-next-line no-global-assign
			Date = class extends Date {
				constructor(...args: Parameters<DateConstructor>) {
					if (args.length === 0) {
						super(mockedTimestamp!);
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

		page.stableScreenshot = async ({
			stableDelay = FRAME_LENGTH * STABLE_FRAME_COUNT,
			locator,
			...options
		} = {}) => {
			let isTimedOut = false;
			if (options.timeout) {
				setTimeout(() => {
					isTimedOut = true;
				}, options.timeout);
			}
			const getScreenshot = () => {
				if (locator) {
					return locator.screenshot(options);
				}
				return page.screenshot(options);
			};
			let prevBuffer: Buffer;
			let buffer: Buffer;
			/* eslint-disable no-await-in-loop */
			// eslint-disable-next-line no-constant-condition
			while (true) {
				if (isTimedOut) {
					throw new Error("Timeout while waiting for stable screenshot");
				}
				// @ts-expect-error typescript doesn't recognize buffer as an initialized buffer
				// even if in second iteration it's initialized
				prevBuffer = buffer || (await getScreenshot());
				await page.waitForTimeout(stableDelay);
				buffer = await getScreenshot();
				if (prevBuffer.equals(buffer)) {
					return buffer;
				}
			}
			/* eslint-enable no-await-in-loop */
		};

		await use(page);
	},
});
