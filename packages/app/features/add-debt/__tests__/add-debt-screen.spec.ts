import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";

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
		await page.navigate({ to: "/debts/add" });
		await awaitCacheKey("currency.top");
		await awaitCacheKey("peers.suggestTop");
	});
	await expect(page).toHaveTitle("RA - Add debt");
	await expect(addButton).toBeDisabled();
});

test("peerId query param pre-selects peer", async ({
	page,
	mockBase,
	awaitCacheKey,
}) => {
	const { peers } = await mockBase();
	const [peer] = peers;
	assert.ok(peer);

	await page.navigate({ to: "/debts/add", search: { peerId: peer.id } });
	await awaitCacheKey("peers.get", { input: { id: peer.id } });

	await expect(
		page.getByTestId("peer").filter({ hasText: peer.name }),
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
		const { peers } = await mockBase();
		const [peer] = peers;
		assert.ok(peer);

		await page.navigate({ to: "/debts/add" });
		await awaitCacheKey("currency.top");
		await awaitCacheKey("peers.suggestTop");
		await fillValidForm(peer);

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
		const { peers } = await mockBase();
		const [peer] = peers;
		assert.ok(peer);

		await page.navigate({ to: "/debts/add" });
		await awaitCacheKey("currency.top");
		await awaitCacheKey("peers.suggestTop");
		await fillValidForm(peer);

		await noteInput.fill("");
		await expect(addButton).toBeDisabled();
	});

	test("on missing peer", async ({
		page,
		addButton,
		amountInput,
		noteInput,
		mockBase,
		awaitCacheKey,
	}) => {
		await mockBase();

		await page.navigate({ to: "/debts/add" });
		await awaitCacheKey("currency.top");
		await awaitCacheKey("peers.suggestTop");

		// Fill amount and note but leave peer empty — form stays invalid
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
		const { peers, topCurrencies } = await mockBase();
		const [peer] = peers;
		assert.ok(peer);

		const createPause = api.createPause();
		api.mockFirst("currency.top", async () => {
			await createPause.promise;
			return { items: topCurrencies.toSorted((a, b) => b.count - a.count) };
		});

		await page.navigate({ to: "/debts/add" });
		await awaitCacheKey("peers.suggestTop");

		await fillValidForm(peer);
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
	const { peers, topCurrencies } = await mockBase();
	const [peer] = peers;
	assert.ok(peer);
	const [topCurrency] = topCurrencies.toSorted((a, b) => b.count - a.count);
	assert.ok(topCurrency);
	const debtId = faker.string.uuid();

	api.mockFirst("debts.add", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "debts.add" error`,
		});
	});

	await page.navigate({ to: "/debts/add" });
	await awaitCacheKey("currency.top");
	await awaitCacheKey("peers.suggestTop");

	await fillValidForm(peer);

	await snapshotQueries(
		async () => {
			await addButton.click();
			await awaitCacheKey("debts.add", { error: 1 });
			await verifyToastTexts(`Mock "debts.add" error`);
		},
		{ name: "error" },
	);
	await page.expectUrl({ to: "/debts/add", search: { peerId: peer.id } });

	const createPause = api.createPause();
	api.mockFirst("debts.add", async () => {
		await createPause.promise;
		return {
			id: debtId,
			updatedAt: Temporal.Now.zonedDateTimeISO(),
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
		await expect(input).toBeDisabled();
	}

	const [debt] = defaultGenerateDebts({ faker, peerId: peer.id, amount: 1 });
	assert.ok(debt);
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
		{ name: "success", blacklistKeys: "peers.get", skipQueries: true },
	);
	await page.expectUrl({ to: "/debts/$id", params: { id: debtId } });
});

test("navigating to a newly added debt doesn't refetch it", async ({
	page,
	api,
	addButton,
	mockBase,
	awaitCacheKey,
	fillValidForm,
	faker,
	snapshotQueries,
}) => {
	const { peers, topCurrencies } = await mockBase();
	const [peer] = peers;
	assert.ok(peer);
	const [topCurrency] = topCurrencies.toSorted((a, b) => b.count - a.count);
	assert.ok(topCurrency);
	const debtId = faker.string.uuid();

	api.mockFirst("debts.add", () => ({
		id: debtId,
		updatedAt: Temporal.Now.zonedDateTimeISO(),
		reverseAccepted: false,
	}));
	const [debt] = defaultGenerateDebts({ faker, peerId: peer.id, amount: 1 });
	assert.ok(debt);
	api.mockFirst("debts.get", ({ input: { id } }) => {
		if (id !== debtId) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Debt "${id}" not found`,
			});
		}
		return { ...debt, id: debtId, currencyCode: topCurrency.currencyCode };
	});

	await page.navigate({ to: "/debts/add" });
	await awaitCacheKey("currency.top");
	await awaitCacheKey("peers.suggestTop");
	await fillValidForm(peer);

	await snapshotQueries(async () => {
		await addButton.click();
		await page.expectUrl({ to: "/debts/$id", params: { id: debtId } });
	});
});
