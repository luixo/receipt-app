import type {
	Expect,
	Locator,
	Page,
	PageScreenshotOptions,
} from "@playwright/test";
import { expect } from "@playwright/test";
import joinImages from "join-images";

import { createMixin } from "./utils";

const FRAME_LENGTH = 33;
const STABLE_FRAME_COUNT = 5;

const stableScreenshot = async ({
	page,
	stableDelay = FRAME_LENGTH * STABLE_FRAME_COUNT,
	locator,
	...options
}: PageScreenshotOptions & {
	page: Page;
	stableDelay?: number;
	locator?: Locator;
}): Promise<Buffer> => {
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

type ScreenshotsMixin = {
	expectScreenshotWithSchemes: (
		name: string,
		options?: Omit<Parameters<typeof stableScreenshot>[0], "page"> &
			Parameters<
				ReturnType<Expect<NonNullable<unknown>>>["toMatchSnapshot"]
			>[0],
	) => Promise<void>;
};

export const screenshotsMixin = createMixin<ScreenshotsMixin>({
	expectScreenshotWithSchemes: async ({ page }, use) => {
		await use(
			async (
				name,
				{
					maxDiffPixelRatio,
					maxDiffPixels,
					threshold,
					fullPage = true,
					mask = [page.getByTestId("sticky-menu")],
					animations = "disabled",
					...restScreenshotOptions
				} = {},
			) => {
				const screenshotOptions = {
					page,
					fullPage,
					mask,
					animations,
					...restScreenshotOptions,
				};
				await page.emulateMedia({ colorScheme: "light" });
				const lightImage = await stableScreenshot(screenshotOptions);
				await page.emulateMedia({ colorScheme: "dark" });
				const darkImage = await stableScreenshot(screenshotOptions);

				const mergedImage = await joinImages([lightImage, darkImage], {
					direction: "horizontal",
					color: "#00ff00",
				});
				await expect
					.soft(await mergedImage.toFormat("png").toBuffer())
					.toMatchSnapshot(name, {
						maxDiffPixelRatio,
						maxDiffPixels,
						threshold,
					});
			},
		);
	},
});
