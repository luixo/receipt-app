import { mergeTests } from "@playwright/test";

import { test as addDebtTest } from "~app/features/add-debt/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";

import { test as peersSuggestFixture } from "./peers-suggest.utils";

const test = mergeTests(addDebtTest, peersSuggestFixture);

test("Recently used peers dropdown", async ({
	page,
	mockBase,
	awaitCacheKey,
	suggestInput,
	suggestListbox,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "middle");
	await mockBase();
	await page.navigate({ to: "/debts/add" });
	await awaitCacheKey("peers.suggestTop");
	await suggestInput("Select a peer").click();
	await expect(page.getByText("Recently used")).toBeVisible();
	await expectScreenshotWithSchemes("recent.png", {
		locator: suggestListbox,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Add peer suggestion for a search", async ({
	page,
	faker,
	api,
	mockBase,
	suggestInput,
	suggestOption,
	suggestListbox,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "middle");
	await mockBase();
	api.mockFirst("peers.suggestTop", { items: [] });
	await page.navigate({ to: "/debts/add" });
	const name = faker.person.firstName();
	const input = suggestInput("Select a peer");
	await input.click();
	await input.fill(name);
	await expect(suggestOption(`Add peer "${name}"`)).toBeVisible();
	await expectScreenshotWithSchemes("search.png", {
		locator: suggestListbox,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
			},
			...expectedPixels.slice(1),
		],
	});
});
