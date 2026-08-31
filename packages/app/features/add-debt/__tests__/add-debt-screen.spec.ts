import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { getNow } from "~utils/date";

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
		await page.goto("/debts/add");
		await awaitCacheKey("currency.top");
		await awaitCacheKey("users.suggestTop");
	});
	await expect(page).toHaveTitle("RA - Add debt");
	await expect(addButton).toBeDisabled();
});

test("userId query param pre-selects user", async ({
	page,
	mockBase,
	awaitCacheKey,
}) => {
	const { users } = await mockBase();
	assert(users[0]);
	const user = users[0];

	await page.goto(`/debts/add?userId=${user.id}`);
	await awaitCacheKey("users.get");

	await expect(
		page.getByTestId("user").filter({ hasText: user.name }),
	).toBeVisible();
});

test.describe("Invalid form disables submit button", () => {
	test("on invalid amount", async ({
		page,
		addButton,
		amountInput,
		mockBase,
		awaitCacheKey,
		fillValidForm,
	}) => {
		const { users } = await mockBase();
		assert(users[0]);
		const user = users[0];

		await page.goto("/debts/add");
		await awaitCacheKey("currency.top");
		await awaitCacheKey("users.suggestTop");
		await fillValidForm(user);

		await amountInput.fill("0");
		await amountInput.press("Tab");
		await expect(addButton).toBeDisabled();
	});

	test("on empty note", async ({
		page,
		addButton,
		noteInput,
		mockBase,
		awaitCacheKey,
		fillValidForm,
	}) => {
		const { users } = await mockBase();
		assert(users[0]);
		const user = users[0];

		await page.goto("/debts/add");
		await awaitCacheKey("currency.top");
		await awaitCacheKey("users.suggestTop");
		await fillValidForm(user);

		await noteInput.fill("");
		await expect(addButton).toBeDisabled();
	});

	test("on missing user", async ({
		page,
		addButton,
		amountInput,
		noteInput,
		mockBase,
		awaitCacheKey,
	}) => {
		await mockBase();

		await page.goto("/debts/add");
		await awaitCacheKey("currency.top");
		await awaitCacheKey("users.suggestTop");

		// Fill amount and note but leave user empty — form stays invalid
		await amountInput.fill("10");
		await amountInput.press("Tab");
		await noteInput.fill("Test debt note");
		await expect(addButton).toBeDisabled();
	});

	test("on missing currency", async ({
		page,
		addButton,
		api,
		mockBase,
		awaitCacheKey,
		fillValidForm,
	}) => {
		const { users, topCurrencies } = await mockBase();
		assert(users[0]);
		const user = users[0];

		const createPause = api.createPause();
		api.mockFirst("currency.top", async () => {
			await createPause.promise;
			return topCurrencies.toSorted((a, b) => b.count - a.count);
		});

		await page.goto("/debts/add");
		await awaitCacheKey("users.suggestTop");

		await fillValidForm(user);
		await expect(addButton).toBeDisabled();

		createPause.resolve();
		await awaitCacheKey("currency.top");
		await expect(addButton).toBeEnabled();
	});
});

test("'debts.add' mutation", async ({
	page,
	api,
	addButton,
	amountInput,
	currencyInput,
	dateInput,
	noteInput,
	mockBase,
	snapshotQueries,
	withLoader,
	verifyToastTexts,
	awaitCacheKey,
	fillValidForm,
	faker,
}) => {
	const { users, topCurrencies } = await mockBase();
	assert(users[0]);
	const user = users[0];
	const sortedCurrencies = topCurrencies.toSorted((a, b) => b.count - a.count);
	assert(sortedCurrencies[0]);
	const topCurrency = sortedCurrencies[0];
	const debtId = faker.string.uuid();

	api.mockFirst("debts.add", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "debts.add" error`,
		});
	});

	await page.goto("/debts/add");
	await awaitCacheKey("currency.top");
	await awaitCacheKey("users.suggestTop");

	await fillValidForm(user);

	await snapshotQueries(
		async () => {
			await addButton.click();
			await awaitCacheKey("debts.add", { errored: 1 });
			await verifyToastTexts(`Mock "debts.add" error`);
		},
		{ name: "error" },
	);
	await expect(page).toHaveURL(`/debts/add?userId=${user.id}`);

	const createPause = api.createPause();
	api.mockFirst("debts.add", async () => {
		await createPause.promise;
		return {
			id: debtId,
			updatedAt: getNow.zonedDateTime(),
			reverseAccepted: false,
		};
	});
	const buttonWithLoader = withLoader(addButton);
	await expect(buttonWithLoader).toBeHidden();
	await snapshotQueries(
		async () => {
			await addButton.click();
			await verifyToastTexts("Adding debt..");
		},
		{ name: "loading" },
	);
	await expect(addButton).toBeDisabled();
	await expect(buttonWithLoader).toBeVisible();
	for (const input of [amountInput, currencyInput, dateInput, noteInput]) {
		// oxlint-disable-next-line no-await-in-loop
		await expect(input).toBeDisabled();
	}

	const [debt] = defaultGenerateDebts({ faker, userId: user.id, amount: 1 });
	assert(debt);
	api.mockFirst("debts.get", ({ input: { id } }) => {
		if (id === debtId) {
			return { ...debt, id: debtId, currencyCode: topCurrency.currencyCode };
		}
		throw new TRPCError({
			code: "NOT_FOUND",
			message: `Debt "${id}" not found`,
		});
	});

	await snapshotQueries(
		async () => {
			createPause.resolve();
			await awaitCacheKey("debts.add");
			await verifyToastTexts("Debt added");
		},
		{ name: "success", blacklistKeys: "users.get", skipQueries: true },
	);
	await expect(page).toHaveURL(`/debts/${debtId}`);
});
