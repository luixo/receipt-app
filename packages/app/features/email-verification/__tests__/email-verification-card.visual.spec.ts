import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Card on account page", async ({
	page,
	mockBase,
	emailVerificationCard,
	expectScreenshotWithSchemes,
}) => {
	await mockBase();
	await page.goto("/account");
	await expect(emailVerificationCard).toBeVisible();
	await expectScreenshotWithSchemes("account-page.png", {
		locator: emailVerificationCard,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [8, 8],
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Loading", async ({
	page,
	api,
	mockBase,
	emailVerificationCard,
	resendButton,
	expectScreenshotWithSchemes,
	skip,
	faker,
	awaitCacheKey,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	await mockBase();
	const resendPause = api.createPause();
	api.mockFirst("account.resendEmail", async () => {
		await resendPause.promise;
		return { email: faker.internet.email() };
	});
	await page.goto("/account");
	await resendButton.click();
	await awaitCacheKey("account.resendEmail", { pending: 1 });
	await expectScreenshotWithSchemes("loading.png", {
		locator: emailVerificationCard,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [8, 8],
			},
			...expectedPixels.slice(1),
		],
	});
	resendPause.resolve();
});

test("Success", async ({
	page,
	api,
	mockBase,
	emailVerificationCard,
	resendButton,
	expectScreenshotWithSchemes,
	skip,
	awaitCacheKey,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	await mockBase();
	api.mockFirst("account.resendEmail", { email: "verification@example.com" });
	await page.goto("/account");
	await resendButton.click();
	await awaitCacheKey("account.resendEmail");
	await expectScreenshotWithSchemes("success.png", {
		locator: emailVerificationCard,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [8, 8],
			},
			...expectedPixels.slice(1),
		],
	});
});
