import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test.beforeEach(async ({ page, mockAdmin, awaitCacheKey }) => {
	await mockAdmin();
	await page.navigate({ to: "/admin" });
	await awaitCacheKey("admin.users");
});

test("default admin and candidate cards", async ({
	adminCards,
	adminCardsBlock,
	expectScreenshotWithSchemes,
}) => {
	await expect(adminCards).toHaveCount(3);
	await expectScreenshotWithSchemes("default-cards.png", {
		locator: adminCardsBlock,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [16, 16],
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Become confirmation", async ({
	becomeButton,
	becomeDialog,
	expectScreenshotWithSchemes,
}) => {
	await becomeButton.first().click();
	await expect(becomeDialog).toBeVisible();
	await expectScreenshotWithSchemes("become-confirmation.png", {
		locator: becomeDialog,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [16, 16],
			},
			...expectedPixels.slice(1),
		],
	});
});

test("impersonated admin and remaining candidate cards", async ({
	adminCards,
	adminCardsBlock,
	becomeButton,
	becomeDialog,
	page,
	expectScreenshotWithSchemes,
}) => {
	await becomeButton.first().click();
	await becomeDialog.getByRole("button", { name: "Yes" }).click();
	await expect(
		page.getByRole("button", { name: "Reset to self" }),
	).toBeVisible();
	await expect(adminCards).toHaveCount(2);
	await expectScreenshotWithSchemes("impersonated-cards.png", {
		locator: adminCardsBlock,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [16, 16],
			},
			...expectedPixels.slice(1),
		],
	});
});

test("full screen with masked cards", async ({
	page,
	adminCardsBlock,
	expectScreenshotWithSchemes,
}) => {
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	await expectScreenshotWithSchemes("full-screen.png", {
		mask: [adminCardsBlock],
	});
});
