import type {
	Expect,
	Locator,
	Page,
	PageScreenshotOptions,
} from "@playwright/test";
import { expect, test } from "@playwright/test";
import { joinImages } from "join-images";
import assert from "node:assert";

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
	assert(first);
	const boundingBox = await first.boundingBox();
	if (!boundingBox) {
		throw new Error(`Expected to have boundingBox for the first locator`);
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
	while (true) {
		// see https://github.com/microsoft/TypeScript/issues/9998
		// "bad behavior on locals" section
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (isTimedOut) {
			throw new Error("Timeout while waiting for stable screenshot");
		}
		prevBuffer = buffer || (await getScreenshot(page, options, locator));
		// This is experimental value to get theme properly changed
		// eslint-disable-next-line playwright/no-wait-for-timeout
		await page.waitForTimeout(stableDelay);
		buffer = await getScreenshot(page, options, locator);
		if (prevBuffer.equals(buffer)) {
			return buffer;
		}
	}
	/* eslint-enable no-await-in-loop */
};

type ScreenshotsFixtures = {
	expectScreenshotWithSchemes: (
		name: string,
		options?: Omit<Parameters<typeof stableScreenshot>[0], "page"> &
			Parameters<ReturnType<Expect>["toMatchSnapshot"]>[0],
	) => Promise<void>;
};

const isMenuPoint = (page: Page, position: { x: number; y: number }) =>
	page.evaluate(
		([{ x, y }]) => {
			const element = document.elementFromPoint(x, y);
			const menu = document.querySelector('[data-testid="sticky-menu"]');
			return menu === element || menu?.contains(element);
		},
		[position] as const,
	);

const checkActionability = async (page: Page, locator: Locator) => {
	const bbox = await locator.boundingBox();
	if (!bbox) {
		return false;
	}
	const menuPoints = await Promise.all([
		isMenuPoint(page, { x: bbox.x, y: bbox.y }),
		isMenuPoint(page, { x: bbox.x + bbox.width, y: bbox.y + bbox.height }),
		isMenuPoint(page, { x: bbox.x, y: bbox.y + bbox.height }),
		isMenuPoint(page, { x: bbox.x + bbox.width, y: bbox.y }),
	]);
	return menuPoints.some(Boolean);
};

export const screenshotsFixtures = test.extend<ScreenshotsFixtures>({
	expectScreenshotWithSchemes: async ({ page }, use) => {
		await use(
			async (
				name,
				{
					maxDiffPixelRatio,
					maxDiffPixels,
					threshold,
					fullPage = true,
					mask = [],
					animations = "disabled",
					...restScreenshotOptions
				} = {},
			) => {
				const isMenuActionable = await checkActionability(
					page,
					page.getByTestId("sticky-menu"),
				);
				const masks = mask.map((maskElement) => {
					const locatorElements = Array.isArray(restScreenshotOptions.locator)
						? restScreenshotOptions.locator
						: [restScreenshotOptions.locator || page];
					// We mask only those that are included in our locator
					return locatorElements.reduce<Locator>(
						(acc, locatorElement) =>
							acc.or(
								"request" in locatorElement
									? maskElement
									: locatorElement.locator(maskElement),
							),
						page.locator("never"),
					);
				});
				const screenshotOptions = {
					page,
					fullPage,
					mask: !isMenuActionable
						? masks
						: [...masks, page.getByTestId("sticky-menu")],
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
				expect
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
