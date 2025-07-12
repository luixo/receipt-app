import type {
	Expect,
	Locator,
	Page,
	PageScreenshotOptions,
} from "@playwright/test";
import { expect, test } from "@playwright/test";
import { joinImages } from "join-images";
import assert from "node:assert";
import { isNonNullish } from "remeda";
import sharp from "sharp";

import type { ColorMode } from "~app/utils/store/color-modes";

const FRAME_LENGTH = 33;
const DELAY_FRAME_COUNT = 5;

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

const getPixelColor = async (
	image: sharp.Sharp,
	boundingBox: BoundingBox,
	[x, y]: [number, number],
) => {
	const { width, height } = boundingBox;
	if (x > width || y > height) {
		return;
	}
	const { data } = await image
		.clone()
		.extract({ left: Math.floor(x), top: Math.floor(y), width: 1, height: 1 })
		.raw()
		.toBuffer({ resolveWithObject: true });
	return `#${Array.from(data)
		.map((component) => component.toString(16).padStart(2, "0"))
		// We currently ignore transparency component
		.slice(0, 3)
		.join("")}`;
};

type RGBColor = `#${string}`;
type ExpectedPixel = { rgb: RGBColor; location: [number, number] };

const getPixelMatchErrors = async (
	image: sharp.Sharp,
	boundingBox: BoundingBox,
	getExpectedPixels: GetExpectedPixels,
	colorMode: ColorMode,
) => {
	const pixelMatches = await Promise.all(
		getExpectedPixels({ boundingBox }).map(
			async ({ rgb: expectedColor, location: [x, y] }) => {
				const actualColor = await getPixelColor(image, boundingBox, [x, y]);
				return { actualColor, expectedColor, location: [x, y] };
			},
		),
	);
	return pixelMatches
		.map(({ actualColor, expectedColor, location: [x, y] }) => {
			if (!actualColor || actualColor === expectedColor) {
				return;
			}
			return `Expected to have "${expectedColor}", got "${actualColor}" at (${x}, ${y}) in ${colorMode} mode.`;
		})
		.filter(isNonNullish);
};

const getImageBoundingBox = async (image: sharp.Sharp) => {
	const metadata = await image.metadata();
	if (!metadata.width || !metadata.height) {
		throw new Error(`Expected to have measured screenshot bbox`);
	}
	return { width: metadata.width, height: metadata.height, x: 0, y: 0 };
};

const stableScreenshot = async (
	{
		page,
		delayBetweenShots = FRAME_LENGTH * DELAY_FRAME_COUNT,
		locator,
		getExpectedPixels,
		...options
	}: PageScreenshotOptions & {
		page: Page;
		delayBetweenShots?: number;
		locator?: Locator | Locator[];
		getExpectedPixels: GetExpectedPixels;
	},
	colorMode: ColorMode,
): Promise<Buffer> => {
	let isTimedOut = false;
	if (options.timeout) {
		setTimeout(() => {
			isTimedOut = true;
		}, options.timeout);
	}
	let prevScreenshot: { buffer: Buffer; timestamp: number } | undefined;
	let screenshot: { buffer: Buffer; timestamp: number } | undefined;
	let errors: string[] = [];
	const checks = ["pixels", "stable"] satisfies ("pixels" | "stable")[];
	const makeScreenshot = async (bbox: BoundingBox | undefined) => ({
		buffer: await page.screenshot({
			scale: "css",
			clip: bbox,
			...options,
		}),
		timestamp: performance.now(),
	});
	/* eslint-disable no-await-in-loop */
	while (checks.length !== 0) {
		const clipBoundingBox = locator
			? await mergeClip(Array.isArray(locator) ? locator : [locator])
			: undefined;
		// see https://github.com/microsoft/TypeScript/issues/9998
		// "bad behavior on locals" section
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (isTimedOut) {
			throw new Error(
				["Timeout while waiting for a screenshot", ...errors].join("\n"),
			);
		}
		const firstCheck = checks[0];
		switch (firstCheck) {
			case "pixels": {
				prevScreenshot = await makeScreenshot(clipBoundingBox);
				const image = sharp(prevScreenshot.buffer);
				const boundingBox =
					clipBoundingBox || (await getImageBoundingBox(image));
				errors = await getPixelMatchErrors(
					image,
					boundingBox,
					getExpectedPixels,
					colorMode,
				);
				if (errors.length === 0) {
					checks.shift();
				}
				break;
			}
			case "stable":
				if (!prevScreenshot) {
					prevScreenshot = await makeScreenshot(clipBoundingBox);
					break;
				}
				if (screenshot) {
					prevScreenshot = screenshot;
				}
				screenshot = await makeScreenshot(clipBoundingBox);
				if (
					prevScreenshot.buffer.equals(screenshot.buffer) &&
					prevScreenshot.timestamp !== screenshot.timestamp
				) {
					checks.shift();
				} else {
					errors = [`Can't stabilize ${colorMode} screenshot`];
				}
				break;
			case undefined:
				break;
		}
		// This is experimental value to get color mode properly changed
		// eslint-disable-next-line playwright/no-wait-for-timeout
		await page.waitForTimeout(delayBetweenShots);
	}
	// We definitely went through screenshotting this time
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return (screenshot || prevScreenshot)!.buffer;
	/* eslint-enable no-await-in-loop */
};

type MapExpectedPixels = (options: {
	boundingBox: BoundingBox;
	expectedPixels: [ExpectedPixel, ...ExpectedPixel[]];
	colorMode: ColorMode;
}) => ExpectedPixel[];
type GetExpectedPixels = (options: {
	boundingBox: BoundingBox;
}) => ExpectedPixel[];

type ScreenshotsFixtures = {
	expectScreenshotWithSchemes: (
		name: string,
		options?: Omit<
			Parameters<typeof stableScreenshot>[0],
			"page" | "getExpectedPixels"
		> &
			Parameters<ReturnType<Expect>["toMatchSnapshot"]>[0] & {
				mapExpectedPixels?: MapExpectedPixels;
				noStickyMenuMask?: boolean;
			},
	) => Promise<void>;
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
					timeout = 5000,
					mapExpectedPixels,
					noStickyMenuMask,
					...restScreenshotOptions
				} = {},
			) => {
				await page.evaluate(() => document.fonts.ready);
				const stickyMenu = page.getByTestId("sticky-menu");
				const stickyMenuBoundingBox = await stickyMenu.boundingBox();
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
				const getImage = async (colorMode: ColorMode) => {
					await page.emulateMedia({ colorScheme: colorMode });
					const rawExpectedPixels = [
						{
							rgb: colorMode === "light" ? "#ffffff" : "#000000",
							location: [0, 0],
						},
						noStickyMenuMask
							? undefined
							: {
									rgb: "#ff00ff",
									location: stickyMenuBoundingBox
										? [stickyMenuBoundingBox.x, stickyMenuBoundingBox.y]
										: [0, 0],
								},
					].filter(isNonNullish) as [ExpectedPixel, ...ExpectedPixel[]];
					return stableScreenshot(
						{
							page,
							fullPage,
							mask: noStickyMenuMask ? masks : [...masks, stickyMenu],
							animations,
							timeout,
							...restScreenshotOptions,
							getExpectedPixels: ({ boundingBox }) =>
								mapExpectedPixels
									? mapExpectedPixels({
											expectedPixels: rawExpectedPixels,
											colorMode,
											boundingBox,
										})
									: rawExpectedPixels,
						},
						colorMode,
					);
				};
				const lightImage = await getImage("light");
				const darkImage = await getImage("dark");

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
