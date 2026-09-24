import type { Locator } from "@playwright/test";
import { mergeTests } from "@playwright/test";

import { test as addDebtTest } from "~app/features/add-debt/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";

import { test as addPeerModalFixture } from "./add-peer-modal.utils";
import { test as peersSuggestFixture } from "./peers-suggest.utils";

const test = mergeTests(addDebtTest, peersSuggestFixture, addPeerModalFixture);

const openAddPeerModal = async (
	suggestInput: (label: string) => Locator,
	suggestOption: (name: string) => Locator,
	searchValue: string,
) => {
	const input = suggestInput("Select a peer");
	await input.click();
	await input.fill(searchValue);
	await suggestOption(`Add peer "${searchValue}"`).click();
};

test("Pre-fills the name field with the typed search value", async ({
	page,
	mockBase,
	suggestInput,
	suggestOption,
	addPeerModal,
	addPeerNameInput,
	addPeerCloseButton,
}) => {
	await mockBase();
	await page.navigate({ to: "/debts/add" });

	await openAddPeerModal(suggestInput, suggestOption, "Ann");
	await expect(addPeerModal).toBeVisible();
	await expect(addPeerNameInput).toHaveValue("Ann");

	await addPeerCloseButton.click();
	await expect(addPeerModal).toBeHidden();
	await expect(suggestInput("Select a peer")).toHaveValue("Ann");
});

test("Resets the form when reopened with a different search value", async ({
	page,
	mockBase,
	suggestInput,
	suggestOption,
	addPeerModal,
	addPeerNameInput,
	addPeerCloseButton,
}) => {
	await mockBase();
	await page.navigate({ to: "/debts/add" });

	await openAddPeerModal(suggestInput, suggestOption, "Ann");
	await addPeerNameInput.fill("Ann Extra");
	await addPeerCloseButton.click();
	await expect(addPeerModal).toBeHidden();

	const input = suggestInput("Select a peer");
	await input.fill("Bob");
	await suggestOption(`Add peer "Bob"`).click();

	await expect(addPeerModal).toBeVisible();
	await expect(addPeerNameInput).toHaveValue("Bob");
});

test("Submitting adds a peer, selects them and closes the modal", async ({
	page,
	api,
	faker,
	mockBase,
	awaitCacheKey,
	suggestInput,
	suggestOption,
	addPeerModal,
	addPeerNameInput,
	addPeerSubmitButton,
	peersSuggest,
}) => {
	await mockBase();
	const newPeerId = faker.string.uuid();
	const newPeerName = faker.person.fullName();
	api.mockFirst("peers.add", () => ({ id: newPeerId, connection: undefined }));

	await page.navigate({ to: "/debts/add" });

	await suggestInput("Select a peer").click();
	await suggestOption("Add a peer").click();
	await expect(addPeerModal).toBeVisible();

	await addPeerNameInput.fill(newPeerName);
	await addPeerSubmitButton.click();
	await awaitCacheKey("peers.add");

	await expect(addPeerModal).toBeHidden();
	await expect(suggestInput("Select a peer")).not.toBeAttached();
	await expect(
		peersSuggest.getByTestId("peer").filter({ hasText: newPeerName }),
	).toBeVisible();
});
