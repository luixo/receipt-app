import type {
	Expect,
	Locator,
	Page,
	PageScreenshotOptions,
	TestInfo,
} from "@playwright/test";
import { expect } from "@playwright/test";
import { Jimp, JimpMime } from "jimp";
import assert from "node:assert";
import * as fs from "node:fs/promises";
import path from "node:path";
import { invert, isNonNullish, mapValues } from "remeda";

import type { ColorMode } from "~app/utils/store/color-modes";

import { toastsFixtures as test } from "./toasts";

const FRAME_LENGTH = 33;
const DELAY_FRAME_COUNT = 5;

type JimpImage = Awaited<ReturnType<typeof Jimp.fromBuffer>>;

const rootDir = path.join(import.meta.dirname, "../../..");

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
	assert.ok(first);
	const boundingBox = await first.boundingBox();
	if (!boundingBox) {
		throw new Error(
			`Expected to have boundingBox for the locator "${first.toString()}"`,
		);
	}
	return mergeClip(rest, mergeBoundingBoxes(boundingBox, acc));
};

const getPixelColor = (
	image: JimpImage,
	boundingBox: BoundingBox,
	[x, y]: [number, number],
) => {
	const { width, height } = boundingBox;
	if (x < 0 || y < 0 || x >= width || y >= height) {
		return;
	}
	const color = image.getPixelColor(Math.floor(x), Math.floor(y));
	// We currently ignore transparency component
	return `#${color.toString(16).padStart(8, "0").slice(0, 6)}` as const;
};

type BoundingBox = NonNullable<PageScreenshotOptions["clip"]>;
type ExpectedPixel = { rgb: `#${string}`; location: [number, number] };

type PixelsPreset = "surface" | "input" | "email" | "avatar";

const pixelsPresetColors = {
	// HeroUI names this pair content1.
	surface: { light: "#ffffff", dark: "#181819" },
	input: { light: "#e9e9e9", dark: "#232323" },
	email: { light: "#eaebed", dark: "#eaebed" },
	avatar: { light: "#f5f5f6", dark: "#060606" },
} satisfies Record<PixelsPreset, Record<ColorMode, `#${string}`>>;

type PixelShift =
	| number
	| [number, number]
	| ((boundingBox: BoundingBox) => [number, number]);

const getExpectedPixel = (
	boundingBox: BoundingBox,
	colorMode: ColorMode,
	pixelsPreset?: PixelsPreset,
	shift: PixelShift = 0,
): ExpectedPixel => {
	const location =
		typeof shift === "function"
			? shift(boundingBox)
			: typeof shift === "number"
				? ([shift, shift] as [number, number])
				: shift;
	return {
		rgb: pixelsPreset
			? pixelsPresetColors[pixelsPreset][colorMode]
			: colorMode === "light"
				? "#ffffff"
				: "#000000",
		location,
	};
};

const findStablePixel = (pixels: string[], minimumRun = 3) => {
	for (let start = 0; start < pixels.length; start += 1) {
		let end = start + 1;
		while (end < pixels.length && pixels[end] === pixels[start]) {
			end += 1;
		}
		if (end - start >= minimumRun) {
			// oxlint-disable-next-line typescript/no-non-null-assertion
			const color = pixels[start]!;
			return { color, location: [start, start] };
		}
	}
	return null;
};

const getPixelProbeHint = (pixels: string[], colorMode: ColorMode) => {
	const stable = findStablePixel(pixels);
	if (!stable) {
		return "No stable pixel found in the first 20 diagonal probes.";
	}
	const color = stable.color.slice(0, 7);
	const preset = (
		invert(mapValues(pixelsPresetColors, (pair) => pair[colorMode])) as Record<
			string,
			PixelsPreset
		>
	)[color];
	return `Found stable pixel at [${stable.location.join(",")}]. ${preset ? `Do you want to use preset ${preset}?` : `It's a novel color ${color}.`}`;
};

const getPixelMatchErrors = (
	image: JimpImage,
	boundingBox: BoundingBox,
	getExpectedPixels: GetExpectedPixels,
	colorMode: ColorMode,
) => {
	const pixelMatches = getExpectedPixels({ boundingBox }).map(
		({ rgb: expectedColor, location: [x, y] }) => {
			const actualColor = getPixelColor(image, boundingBox, [x, y]);
			return { actualColor, expectedColor, location: [x, y] };
		},
	);
	return pixelMatches
		.map(({ actualColor, expectedColor, location: [x, y] }) => {
			if (!actualColor || actualColor === expectedColor) {
				return undefined;
			}
			return `Expected to have "${expectedColor}", got "${actualColor}" at (${x}, ${y}) in ${colorMode} mode.`;
		})
		.filter(isNonNullish);
};

const getImageBoundingBox = (image: JimpImage) => ({
	width: image.width,
	height: image.height,
	x: 0,
	y: 0,
});

const joinImagesHorizontally = async (buffers: Buffer[], color: number) => {
	const images = await Promise.all(
		buffers.map((buffer) => Jimp.fromBuffer(buffer)),
	);
	const width = images.reduce((sum, image) => sum + image.width, 0);
	const height = Math.max(...images.map((image) => image.height));
	const canvas = new Jimp({ width, height, color });
	images.reduce((offsetX, image) => {
		canvas.composite(image, offsetX, 0);
		return offsetX + image.width;
	}, 0);
	return canvas;
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
	{
		testInfo,
		screenshotsDir,
	}: {
		testInfo: TestInfo;
		screenshotsDir: string;
	},
): Promise<Buffer> => {
	let isTimedOut = false;
	if (options.timeout) {
		setTimeout(() => {
			isTimedOut = true;
		}, options.timeout);
	}
	let prevScreenshot: { buffer: Buffer; timestamp: number } | undefined =
		undefined;
	let screenshot: { buffer: Buffer; timestamp: number } | undefined = undefined;
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
	while (checks.length !== 0) {
		const clipBoundingBox = locator
			? await mergeClip(Array.isArray(locator) ? locator : [locator])
			: undefined;
		// see https://github.com/microsoft/TypeScript/issues/9998
		// "bad behavior on locals" section
		// oxlint-disable-next-line typescript/no-unnecessary-condition
		if (isTimedOut) {
			if (checks.includes("pixels") && prevScreenshot) {
				const image = await Jimp.fromBuffer(prevScreenshot.buffer);
				const failedScreenshotPath = path.join(
					screenshotsDir,
					path.relative(
						rootDir,
						testInfo.snapshotPath("failed-screenshot.png", {
							kind: "screenshot",
						}),
					),
				) as "failed-screenshot.png";
				await fs.mkdir(path.dirname(failedScreenshotPath), { recursive: true });
				await image.write(failedScreenshotPath);
				errors.push(
					`Use \`open ${path.relative(rootDir, failedScreenshotPath)}\` to see the failed screenshot`,
				);
				const pixels = Array.from(
					{ length: Math.min(20, image.width, image.height) },
					(_, coordinate) =>
						`#${image.getPixelColor(coordinate, coordinate).toString(16).padStart(8, "0")}`,
				);
				errors.push(getPixelProbeHint(pixels, colorMode));
			}
			throw new Error(
				["Timeout while waiting for a screenshot", ...errors].join("\n"),
			);
		}
		const [firstCheck] = checks;
		switch (firstCheck) {
			case "pixels": {
				prevScreenshot = await makeScreenshot(clipBoundingBox);
				const image = await Jimp.fromBuffer(prevScreenshot.buffer);
				const boundingBox = clipBoundingBox || getImageBoundingBox(image);
				errors = getPixelMatchErrors(
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
		// oxlint-disable-next-line playwright/no-wait-for-timeout
		await page.waitForTimeout(delayBetweenShots);
	}
	// We definitely went through screenshotting this time
	// oxlint-disable-next-line typescript/no-non-null-assertion
	return (screenshot || prevScreenshot)!.buffer;
};

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
				pixelsPreset?: PixelsPreset;
				shift?: PixelShift;
				noStickyMenuMask?: boolean;
			},
	) => Promise<void>;
};

type ScreenshotsWorkerFixtures = {
	screenshotsDir: string;
};

export const screenshotsFixtures = test.extend<
	ScreenshotsFixtures,
	ScreenshotsWorkerFixtures
>({
	screenshotsDir: [
		async ({}, use) =>
			use(path.join(rootDir, ".tmp", `pws-${process.env.PLAYWRIGHT_RUN_ID}`)),
		{ auto: true, scope: "worker" },
	],
	expectScreenshotWithSchemes: async (
		{ page, toast, screenshotsDir },
		use,
		testInfo,
	) => {
		await use(
			async (
				name,
				{
					maxDiffPixelRatio,
					maxDiffPixels = 3,
					threshold,
					fullPage = true,
					mask = [],
					animations = "disabled",
					timeout = 5000,
					pixelsPreset,
					shift,
					noStickyMenuMask,
					...restScreenshotOptions
				} = {},
			) => {
				await page.evaluate(() => document.fonts.ready);
				const toastTextContents = await toast.allTextContents();
				if (toastTextContents.length !== 0) {
					throw new Error(
						`There are visible toasts, please clear toasts before making a screenshot!\n${toastTextContents.map((text) => `Toast "${text}"`).join("\n")}`,
					);
				}
				const stickyMenu = page.getByTestId("sticky-menu");
				const stickyMenuBoundingBox = noStickyMenuMask
					? null
					: await stickyMenu.boundingBox();
				const getImage = async (colorMode: ColorMode) => {
					await page.emulateMedia({ colorScheme: colorMode });
					const maskPixels = [
						noStickyMenuMask
							? undefined
							: {
									rgb: "#ff00ff",
									location: stickyMenuBoundingBox
										? [stickyMenuBoundingBox.x, stickyMenuBoundingBox.y]
										: [0, 0],
								},
					].filter(isNonNullish) as ExpectedPixel[];
					return stableScreenshot(
						{
							page,
							fullPage,
							mask: noStickyMenuMask ? mask : [...mask, stickyMenu],
							animations,
							timeout,
							...restScreenshotOptions,
							getExpectedPixels: ({ boundingBox }) => [
								getExpectedPixel(boundingBox, colorMode, pixelsPreset, shift),
								...maskPixels,
							],
						},
						colorMode,
						{ testInfo, screenshotsDir },
					);
				};
				const lightImage = await getImage("light");
				const darkImage = await getImage("dark");

				const mergedImage = await joinImagesHorizontally(
					[lightImage, darkImage],
					0x00_ff_00_ff,
				);
				expect
					.soft(await mergedImage.getBuffer(JimpMime.png))
					.toMatchSnapshot(name, {
						maxDiffPixelRatio,
						maxDiffPixels,
						threshold,
					});
			},
		);
	},
});
