import { TRPCError } from "@trpc/server";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./utils";

test("On load", async ({
	page,
	addButton,
	mockBase,
	snapshotQueries,
	awaitCacheKey,
}) => {
	await mockBase();
	await snapshotQueries(async () => {
		await page.goto("/users/add");
		await awaitCacheKey("account.get");
	});
	await expect(page).toHaveTitle("RA - Add user");
	await expect(addButton).toBeDisabled();
});

test.describe("Invalid form disables submit button", () => {
	test.beforeEach(async ({ mockBase, page, awaitCacheKey, fillValidForm }) => {
		await mockBase();
		await page.goto("/users/add");
		await awaitCacheKey("account.get");
		await fillValidForm();
	});

	test("on empty name", async ({ addButton, nameInput }) => {
		await nameInput.fill("");
		await expect(addButton).toBeDisabled();
	});

	test("on invalid email", async ({ addButton, emailInput }) => {
		await emailInput.fill("not-an-email");
		await emailInput.press("Tab");
		await expect(addButton).toBeDisabled();
	});
});

test("'users.add' mutation", async ({
	page,
	api,
	addButton,
	nameInput,
	emailInput,
	mockBase,
	snapshotQueries,
	withLoader,
	verifyToastTexts,
	awaitCacheKey,
	fillValidForm,
	faker,
}) => {
	await mockBase();
	const userId = faker.string.uuid();
	const userName = "Test user";

	api.mockFirst("users.add", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "users.add" error`,
		});
	});

	await page.goto("/users/add");
	await awaitCacheKey("account.get");
	await fillValidForm(userName);

	await snapshotQueries(
		async () => {
			await addButton.click();
			await awaitCacheKey("users.add", { errored: 1 });
			await verifyToastTexts(`Mock "users.add" error`);
		},
		{ name: "error" },
	);
	await expect(page).toHaveURL("/users/add");

	const createPause = api.createPause();
	api.mockFirst("users.add", async () => {
		await createPause.promise;
		return { id: userId, connection: undefined };
	});
	const buttonWithLoader = withLoader(addButton);
	await expect(buttonWithLoader).toBeHidden();
	await snapshotQueries(
		async () => {
			await addButton.click();
			await verifyToastTexts(`Adding user "${userName}"`);
		},
		{ name: "loading" },
	);
	await expect(addButton).toBeDisabled();
	await expect(buttonWithLoader).toBeVisible();
	for (const input of [nameInput, emailInput]) {
		// eslint-disable-next-line no-await-in-loop
		await expect(input).toBeDisabled();
	}

	api.mockFirst("users.get", ({ input: { id }, next }) => {
		if (id === userId) {
			return {
				id: userId,
				name: userName,
				publicName: undefined,
				connectedAccount: undefined,
			};
		}
		return next();
	});

	await snapshotQueries(
		async () => {
			createPause.resolve();
			await awaitCacheKey("users.add");
			await verifyToastTexts(`User "${userName}" added`);
		},
		{ name: "success", blacklistKeys: "users.get", skipQueries: true },
	);
	await expect(page).toHaveURL(`/users/${userId}`);
});
