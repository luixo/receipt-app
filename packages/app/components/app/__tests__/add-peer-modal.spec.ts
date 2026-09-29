import { mergeTests } from "@playwright/test";

import { test as addDebtTest } from "#app/features/add-debt/__tests__/utils.ts";
import { expect } from "#tests/frontend/fixtures.ts";

import { test as addPeerModalFixture } from "./add-peer-modal.utils";
import { test as peersSuggestFixture } from "./peers-suggest.utils";

const test = mergeTests(addDebtTest, peersSuggestFixture, addPeerModalFixture);

test("Pre-fills the name field with the typed search value", async ({
	page,
	faker,
	mockBase,
	suggestInput,
	suggestOption,
	addPeerModal,
	addPeerNameInput,
	addPeerCloseButton,
}) => {
	await mockBase();
	await page.navigate({ to: "/debts/add" });

	const name = faker.person.firstName();
	const input = suggestInput("Select a peer");
	await input.click();
	await input.fill(name);
	await suggestOption(`Add peer "${name}"`).click();
	await expect(addPeerModal).toBeVisible();
	await expect(addPeerNameInput).toHaveValue(name);

	await addPeerCloseButton.click();
	await expect(addPeerModal).toBeHidden();
	await expect(input).toHaveValue(name);
});

test("Resets the form when reopened with a different search value", async ({
	page,
	faker,
	mockBase,
	suggestInput,
	suggestOption,
	addPeerModal,
	addPeerNameInput,
	addPeerCloseButton,
}) => {
	await mockBase();
	const name = faker.person.firstName();
	const anotherName = faker.person.firstName();
	await page.navigate({ to: "/debts/add" });

	const input = suggestInput("Select a peer");
	await input.click();
	await input.fill(name);
	await suggestOption(`Add peer "${name}"`).click();
	await addPeerCloseButton.click();
	await expect(addPeerModal).toBeHidden();

	await input.fill(anotherName);
	await suggestOption(`Add peer "${anotherName}"`).click();

	await expect(addPeerModal).toBeVisible();
	await expect(addPeerNameInput).toHaveValue(anotherName);
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
	await suggestOption("Add peer").click();
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

test("Empty peer name cannot be submitted", async ({
	page,
	mockBase,
	suggestInput,
	suggestOption,
	addPeerModal,
	addPeerSubmitButton,
}) => {
	await mockBase();
	await page.navigate({ to: "/debts/add" });
	await suggestInput("Select a peer").click();
	await suggestOption("Add peer").click();
	await expect(addPeerModal).toBeVisible();
	await expect(addPeerSubmitButton).toBeDisabled();
});
