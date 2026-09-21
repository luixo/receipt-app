import { test as originalTest } from "~tests/frontend/fixtures";
import type { ExtractFixture } from "~tests/frontend/types";

type Fixtures = {
	expectBodyScreenshot: (
		body: string,
		name: string,
		opts?: Parameters<
			ExtractFixture<typeof originalTest>["expectScreenshotWithSchemes"]
		>[1],
	) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	expectBodyScreenshot: ({ page, expectScreenshotWithSchemes }, use) =>
		use(async (body, name, opts) => {
			await page.setContent(body);
			await expectScreenshotWithSchemes(name, {
				fullPage: true,
				noStickyMenuMask: true,
				mapExpectedPixels: () => [{ rgb: "#eaebed", location: [0, 0] }],
				...opts,
			});
		}),
});
