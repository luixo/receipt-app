import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test.beforeEach(async ({ openSettings }) => {
	await openSettings();
});

test("Settings screen", async ({ page, expectScreenshotWithSchemes }) => {
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	await expectScreenshotWithSchemes("screen.png");
});

test("Manual accept debts mutation loading state", async ({
	api,
	manualAcceptDebtsSwitch,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	const pause = api.createPause();
	api.mockFirst("accountSettings.update", async () => {
		await pause.promise;
	});
	await manualAcceptDebtsSwitch.click();
	await expect(manualAcceptDebtsSwitch).toBeDisabled();
	await expectScreenshotWithSchemes("manual-accept-debts-loading.png", {
		locator: manualAcceptDebtsSwitch,
	});
	pause.resolve();
});

test("Manual accept debts mutation error state", async ({
	api,
	manualAcceptDebtsSwitch,
	errorMessage,
	awaitCacheKey,
	verifyToastTexts,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	api.mockFirst("accountSettings.update", () => {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Mock "accountSettings.update" error`,
		});
	});
	await manualAcceptDebtsSwitch.click();
	await awaitCacheKey("accountSettings.update", { errored: 1 });
	await verifyToastTexts(
		`Account settings update failed: Mock "accountSettings.update" error`,
	);
	await expectScreenshotWithSchemes("manual-accept-debts-error.png", {
		locator: errorMessage(),
		// Card's rounded corner means the top-left pixel isn't the page background;
		// inset far enough to clear the curve's antialiasing (varies slightly across browsers/OSes)
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [16, 16],
			},
			...expectedPixels.slice(1),
		],
	});
});
