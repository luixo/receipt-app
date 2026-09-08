import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("Card on account page", async ({
	page,
	mockUnverified,
	emailVerificationCard,
	expectScreenshotWithSchemes,
}) => {
	await mockUnverified();
	await page.goto("/account");
	await expect(emailVerificationCard).toBeVisible();
	await expectScreenshotWithSchemes("account-page.png", {
		mapExpectedPixels: ({ expectedPixels, boundingBox, colorMode }) => [
			{
				...expectedPixels[0],
				// Mobile viewports render the top-left page pixel slightly off-white
				rgb:
					colorMode === "light" && boundingBox.width <= 600
						? "#fefefe"
						: expectedPixels[0].rgb,
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Loading", async ({
	page,
	api,
	mockUnverified,
	emailVerificationCard,
	resendButton,
	expectScreenshotWithSchemes,
	skip,
	faker,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	await mockUnverified();
	const resendPause = api.createPause();
	api.mockFirst("account.resendEmail", async () => {
		await resendPause.promise;
		return { email: faker.internet.email() };
	});
	await page.goto("/account");
	await resendButton.click();
	await expect(resendButton).toBeDisabled();
	await expectScreenshotWithSchemes("loading.png", {
		locator: emailVerificationCard,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				// (0, 0) is the card corner showing the shadow-blended page background
				rgb: colorMode === "light" ? "#fbfbfb" : "#000000",
			},
			...expectedPixels.slice(1),
		],
	});
	resendPause.resolve();
});

test("Success", async ({
	page,
	api,
	mockUnverified,
	emailVerificationCard,
	resendButton,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	await mockUnverified();
	api.mockFirst("account.resendEmail", {
		email: "verification@example.com",
	});
	await page.goto("/account");
	await resendButton.click();
	await expect(
		emailVerificationCard.getByText(
			"Email successfully sent to verification@example.com!",
		),
	).toBeVisible();
	await expectScreenshotWithSchemes("success.png", {
		locator: emailVerificationCard,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				// (0, 0) is the card corner showing the shadow-blended page background
				rgb: colorMode === "light" ? "#fbfbfb" : "#000000",
			},
			...expectedPixels.slice(1),
		],
	});
});
