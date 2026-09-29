import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as addDebtTest } from "#app/features/add-debt/__tests__/utils.ts";
import { expect } from "#tests/frontend/fixtures.ts";
import { defaultGeneratePeers } from "#tests/frontend/generators/peers.ts";

import { test as peersSuggestFixture } from "./peers-suggest.utils";

const test = mergeTests(addDebtTest, peersSuggestFixture);

test("Shows recently used peers and the add-peer entry before searching", async ({
	page,
	mockBase,
	awaitCacheKey,
	suggestInput,
	suggestOption,
}) => {
	const { peers } = await mockBase();
	const [firstPeer] = peers;
	assert.ok(firstPeer);
	await page.navigate({ to: "/debts/add" });
	await awaitCacheKey("peers.suggestTop");

	await suggestInput("Select a peer").click();
	await expect(page.getByText("Recently used")).toBeVisible();
	await expect(suggestOption(firstPeer.name)).toBeVisible();
	await expect(page.getByText("Lookup", { exact: true })).toHaveCount(0);
	await expect(suggestOption("Add peer")).toBeVisible();
});

test("Filters recent peers, shows lookup peers without duplicates and selects one", async ({
	page,
	api,
	faker,
	mockBase,
	suggestInput,
	suggestOption,
	peersSuggest,
}) => {
	const { peers } = await mockBase();
	const [recentPeer] = peers;
	const [lookupPeer] = defaultGeneratePeers({ faker, amount: 1 });
	assert.ok(recentPeer);
	assert.ok(lookupPeer);
	const search = "LookupUnique";
	api.mockUtils.mockPeers(
		{ ...recentPeer, name: `${search} Recent` },
		{ ...lookupPeer, name: `${search} Result` },
	);
	api.mockFirst("peers.suggest", ({ input }) => ({
		cursor: 0,
		count: 2,
		items: input.input === search ? [recentPeer.id, lookupPeer.id] : [],
	}));
	await page.navigate({ to: "/debts/add" });

	const input = suggestInput("Select a peer");
	await input.click();
	await input.fill(search);
	await expect(page.getByText("Lookup", { exact: true })).toBeVisible();
	await expect(page.getByText("Recently used")).toBeVisible();
	await expect(suggestOption(`${search} Recent`)).toHaveCount(1);
	await expect(suggestOption(recentPeer.name)).toHaveCount(0);
	const lookupOption = suggestOption(`${search} Result`);
	await expect(lookupOption).toHaveCount(1);
	await lookupOption.click();
	await expect(input).not.toBeAttached();
	await expect(
		peersSuggest.getByTestId("peer").filter({ hasText: `${search} Result` }),
	).toBeVisible();
});

test("Suggests adding the entered name and opens the pre-filled modal", async ({
	page,
	mockBase,
	suggestInput,
	suggestOption,
	modal,
}) => {
	const { peers } = await mockBase();
	const [firstPeer] = peers;
	assert.ok(firstPeer);
	await page.navigate({ to: "/debts/add" });
	const input = suggestInput("Select a peer");
	await input.click();
	await input.fill(firstPeer.name.slice(0, 3));
	await expect(suggestOption("Add peer")).toBeVisible();
	const newName = `${firstPeer.name} New`;
	await input.fill(newName);
	await suggestOption(`Add peer "${newName}"`).click();
	await expect(
		modal("Add peer").getByRole("textbox", { name: "Peer name" }),
	).toHaveValue(newName);
});
