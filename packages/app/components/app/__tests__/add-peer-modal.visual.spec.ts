import { mergeTests } from "@playwright/test";

import { test as addDebtTest } from "#app/features/add-debt/__tests__/utils.ts";
import { expect } from "#tests/frontend/fixtures.ts";

import { test as addPeerModalFixture } from "./add-peer-modal.utils";
import { test as peersSuggestFixture } from "./peers-suggest.utils";

const test = mergeTests(addDebtTest, peersSuggestFixture, addPeerModalFixture);

test("Empty peer form", async ({
	page,
	mockBase,
	suggestInput,
	suggestOption,
	addPeerModal,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	await mockBase();
	await page.navigate({ to: "/debts/add" });
	await suggestInput("Select a peer").click();
	await suggestOption("Add peer").click();
	await expect(addPeerModal).toBeVisible();
	await expectScreenshotWithSchemes("empty.png", {
		locator: addPeerModal,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#1e1e21",
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Pre-filled peer form", async ({
	page,
	faker,
	mockBase,
	suggestInput,
	suggestOption,
	addPeerModal,
	addPeerNameInput,
	expectScreenshotWithSchemes,
	skip,
}, testInfo) => {
	skip(testInfo, "only-biggest");
	await mockBase();
	await page.navigate({ to: "/debts/add" });
	const input = suggestInput("Select a peer");
	const name = faker.person.firstName();
	await input.click();
	await input.fill(name);
	await suggestOption(`Add peer "${name}"`).click();
	await expect(addPeerNameInput).toHaveValue(name);
	await expectScreenshotWithSchemes("pre-filled.png", {
		locator: addPeerModal,
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				...expectedPixels[0],
				rgb: colorMode === "light" ? "#ffffff" : "#1e1e21",
			},
			...expectedPixels.slice(1),
		],
	});
});
