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

type BoundingBox = NonNullable<PageScreenshotOptions["clip"]>;

const mergeBoundingBoxes = (
	bbox1: BoundingBox,
	bbox2?: BoundingBox,
): BoundingBox => {
	if (!bbox2) {
		return bbox1;
	}
	const minX = Math.min(bbox1.x, bbox2.x);
	const minY = Math.min(bbox1.y, bbox2.y);
	const maxX = Math.max(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
	const maxY = Math.max(bbox1.y + bbox1.height, bbox2.y + bbox2.height);
	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY,
	};
};

const mergeClip = async (
	locators: Locator[],
	acc?: BoundingBox,
): Promise<BoundingBox> => {
	if (locators.length === 0) {
		return acc || { x: 0, y: 0, width: 0, height: 0 };
	}
	const [first, ...rest] = locators;
	const boundingBox = await first!.boundingBox();
	if (!boundingBox) {
		throw new Error(`Expected to have boundingBox for ${String(first)}`);
	}
	return mergeClip(rest, mergeBoundingBoxes(boundingBox, acc));
};

const getScreenshot = async (
	page: Page,
	options: PageScreenshotOptions,
	locator?: Locator | Locator[],
) => {
	if (locator) {
		if (!Array.isArray(locator)) {
			return locator.screenshot(options);
		}
		return page.screenshot({
			...options,
			clip: await mergeClip(locator),
		});
	}
	return page.screenshot(options);
};

const stableScreenshot = async ({
	page,
	stableDelay = FRAME_LENGTH * STABLE_FRAME_COUNT,
	locator,
	...options
}: PageScreenshotOptions & {
	page: Page;
	stableDelay?: number;
	locator?: Locator | Locator[];
}): Promise<Buffer> => {
	let isTimedOut = false;
	if (options.timeout) {
		setTimeout(() => {
			isTimedOut = true;
		}, options.timeout);
	}
	let prevBuffer: Buffer;
	let buffer: Buffer | undefined;
	/* eslint-disable no-await-in-loop */
	// eslint-disable-next-line no-constant-condition
	while (true) {
		if (isTimedOut) {
			throw new Error("Timeout while waiting for stable screenshot");
		}
		prevBuffer = buffer || (await getScreenshot(page, options, locator));
		await page.waitForTimeout(stableDelay);
		buffer = await getScreenshot(page, options, locator);
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
