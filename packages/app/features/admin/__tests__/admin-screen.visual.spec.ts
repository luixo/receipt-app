import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test.beforeEach(async ({ page, mockAdmin, awaitCacheKey }) => {
	await mockAdmin();
	await page.navigate({ to: "/admin" });
	await awaitCacheKey("admin.users");
});

test("default admin and candidate cards", async ({
	adminCards,
	adminCardGroup,
	expectScreenshotWithSchemes,
}) => {
	await expect(adminCards).toHaveCount(3);
	await expectScreenshotWithSchemes("default-cards.png", {
		locator: adminCardGroup,
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
	page,
	adminCards,
	expectScreenshotWithSchemes,
}) => {
	await adminCards.nth(1).getByRole("button", { name: "Become" }).click();
	const confirmation = page.getByRole("dialog");
	await expect(confirmation).toBeVisible();
	await expect(confirmation).toHaveCSS("transform", "none");
	await expectScreenshotWithSchemes("become-confirmation.png", {
		locator: confirmation,
		fullPage: false,
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
	adminCardGroup,
	page,
	expectScreenshotWithSchemes,
}) => {
	await adminCards.nth(1).getByRole("button", { name: "Become" }).click();
	await page.getByRole("dialog").getByRole("button", { name: "Yes" }).click();
	await expect(
		page.getByRole("button", { name: "Reset to self" }),
	).toBeVisible();
	await expect(adminCards).toHaveCount(2);
	await expectScreenshotWithSchemes("impersonated-cards.png", {
		locator: adminCardGroup,
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
