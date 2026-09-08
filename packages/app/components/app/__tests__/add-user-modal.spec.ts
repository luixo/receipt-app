import type { Locator } from "@playwright/test";
import { mergeTests } from "@playwright/test";

import { test as addDebtTest } from "~app/features/add-debt/__tests__/utils";
import { expect } from "~tests/frontend/fixtures";

import { test as addUserModalFixture } from "./add-user-modal.utils";
import { test as usersSuggestFixture } from "./users-suggest.utils";

const test = mergeTests(addDebtTest, usersSuggestFixture, addUserModalFixture);

const openAddUserModal = async (
	suggestInput: (label: string) => Locator,
	suggestOption: (name: string) => Locator,
	searchValue: string,
) => {
	const input = suggestInput("Select a user");
	await input.click();
	await input.fill(searchValue);
	await suggestOption(`Add user "${searchValue}"`).click();
};

test("Pre-fills the name field with the typed search value", async ({
	page,
	mockBase,
	suggestInput,
	suggestOption,
	addUserModal,
	addUserNameInput,
	addUserCloseButton,
}) => {
	await mockBase();
	await page.goto("/debts/add");

	await openAddUserModal(suggestInput, suggestOption, "Ann");
	await expect(addUserModal).toBeVisible();
	await expect(addUserNameInput).toHaveValue("Ann");

	await addUserCloseButton.click();
	await expect(addUserModal).toBeHidden();
	await expect(suggestInput("Select a user")).toHaveValue("Ann");
});

test("Resets the form when reopened with a different search value", async ({
	page,
	mockBase,
	suggestInput,
	suggestOption,
	addUserModal,
	addUserNameInput,
	addUserCloseButton,
}) => {
	await mockBase();
	await page.goto("/debts/add");

	await openAddUserModal(suggestInput, suggestOption, "Ann");
	await addUserNameInput.fill("Ann Extra");
	await addUserCloseButton.click();
	await expect(addUserModal).toBeHidden();

	const input = suggestInput("Select a user");
	await input.fill("Bob");
	await suggestOption(`Add user "Bob"`).click();

	await expect(addUserModal).toBeVisible();
	await expect(addUserNameInput).toHaveValue("Bob");
});

test("Submitting adds a user, selects them and closes the modal", async ({
	page,
	api,
	faker,
	mockBase,
	awaitCacheKey,
	suggestInput,
	suggestOption,
	addUserModal,
	addUserNameInput,
	addUserSubmitButton,
	usersSuggest,
}) => {
	await mockBase();
	const newUserId = faker.string.uuid();
	const newUserName = faker.person.fullName();
	api.mockFirst("users.add", () => ({ id: newUserId, connection: undefined }));

	await page.goto("/debts/add");

	await suggestInput("Select a user").click();
	await suggestOption("Add a user").click();
	await expect(addUserModal).toBeVisible();

	await addUserNameInput.fill(newUserName);
	await addUserSubmitButton.click();
	await awaitCacheKey("users.add");

	await expect(addUserModal).toBeHidden();
	await expect(suggestInput("Select a user")).not.toBeAttached();
	await expect(
		usersSuggest.getByTestId("user").filter({ hasText: newUserName }),
	).toBeVisible();
});
