import type { Page } from "@playwright/test";

import type { ApiManager } from "./api";

export const gotoWithMocks = (page: Page, api: ApiManager): Page["goto"] => {
	const { port, controllerId } = api.getConnection();
	const originalGoto = page.goto.bind(page);
	return async (url, options) => {
		const baseUrl = "http://localhost";
		const urlObject = new URL(url, baseUrl);
		urlObject.searchParams.set("proxyPort", port.toString());
		urlObject.searchParams.set("controllerId", controllerId);
		const result = await originalGoto(
			urlObject.toString().replace(baseUrl, ""),
			options,
		);

		// Fake date
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

		await page.locator("hydrated").waitFor({ state: "attached" });
		return result;
	};
};

export const stableScreenshot =
	(page: Page): Page["stableScreenshot"] =>
	// 1 frame = 33ms
	async ({ stableDelay = 33 * 5, ...options } = {}) => {
		let isTimedOut = false;
		if (options.timeout) {
			setTimeout(() => {
				isTimedOut = true;
			}, options.timeout);
		}
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
			prevBuffer = buffer || (await page.screenshot());
			await page.waitForTimeout(stableDelay);
			buffer = await page.screenshot(options);
			if (prevBuffer.equals(buffer)) {
				return buffer;
			}
		}
		/* eslint-enable no-await-in-loop */
	};
