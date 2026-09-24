import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as debtsGroupTest } from "~app/components/app/__tests__/debts-group.utils";
import { formatCurrency } from "~app/utils/currency";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";

import { test as localTest } from "./utils";

const test = mergeTests(localTest, debtsGroupTest);

test("On load", async ({
	page,
	mockDebts,
	debtPreview,
	debtAmount,
	snapshotQueries,
}) => {
	const {
		debtPeer: peer,
		debts: [firstDebt],
		debts,
	} = await mockDebts();
	assert.ok(firstDebt);
	await snapshotQueries(
		async () => {
			await page.navigate({ to: "/debts/peer/$id", params: { id: peer.id } });
			await expect(
				page.getByRole("button", { name: "Transfer debts" }),
			).toBeVisible();
			await expect(
				page.getByRole("button", { name: "Add debt" }),
			).toBeVisible();
			await expect(debtPreview).toHaveCount(debts.length);
			await expect(debtAmount.first()).toHaveText(
				formatCurrency(
					localSettings.locale,
					firstDebt.currencyCode,
					Math.abs(firstDebt.amount),
				),
			);
		},
		{ name: "on-load" },
	);
});

test("Transfer link preserves the peer", async ({ page, api, mockDebts }) => {
	const { debtPeer } = await mockDebts();
	api.mockFirst("peers.suggestTop", { items: [] });
	await page.navigate({ to: "/debts/peer/$id", params: { id: debtPeer.id } });
	await page.getByRole("button", { name: "Transfer debts" }).click();
	await page.expectUrl({
		to: "/debts/transfer",
		search: { from: debtPeer.id },
	});
});

test("Add link preserves the peer", async ({ page, api, mockDebts }) => {
	const { debtPeer } = await mockDebts();
	api.mockFirst("currency.top", { items: [] });
	api.mockFirst("peers.suggestTop", { items: [] });
	await page.navigate({ to: "/debts/peer/$id", params: { id: debtPeer.id } });
	await page.getByRole("button", { name: "Add debt" }).click();
	await page.expectUrl({ to: "/debts/add", search: { peerId: debtPeer.id } });
});

test("Connected peers show debt sync status", async ({
	page,
	faker,
	mockDebts,
}) => {
	const { debtPeer, debts } = await mockDebts({
		generatePeers: (opts) =>
			defaultGeneratePeers(opts).map((peer) => ({
				...peer,
				connectedUser: {
					id: faker.string.uuid(),
					email: faker.internet.email(),
				},
			})),
	});
	assert.ok(debts[0]);
	await page.navigate({ to: "/debts/peer/$id", params: { id: debtPeer.id } });
	await expect(page.getByTestId("debt-sync-status").first()).toBeVisible();
});

test("Debt preview navigates to the debt", async ({
	page,
	mockDebts,
	debtPreview,
}) => {
	const { debtPeer, debts } = await mockDebts();
	assert.ok(debts[0]);
	await page.navigate({ to: "/debts/peer/$id", params: { id: debtPeer.id } });
	await debtPreview.first().click();
	await page.expectUrl({ to: "/debts/$id", params: { id: debts[0].id } });
});

test("Edit button opens the peer modal", async ({ page, mockDebts, modal }) => {
	const { debtPeer } = await mockDebts();
	await page.navigate({ to: "/debts/peer/$id", params: { id: debtPeer.id } });
	await page.getByRole("button", { name: "Edit peer" }).click();
	await expect(modal("Edit peer")).toBeVisible();
});

test("Empty list shows the filtered empty state", async ({
	page,
	mockBase,
	api,
}) => {
	const { debtPeer } = await mockBase();
	api.mockFirst("debts.getAllPeer", { items: [] });
	api.mockFirst("debts.getByPeerPaged", { items: [], count: 0, cursor: 0 });
	await page.navigate({ to: "/debts/peer/$id", params: { id: debtPeer.id } });
	await expect(page.getByText("No debts under given filters")).toBeVisible();
});

test("Show resolved button enables resolved debts", async ({
	page,
	api,
	mockDebts,
	showResolvedButton,
	debtPreview,
	awaitCacheKey,
}) => {
	const { debtPeer, debts } = await mockDebts({
		generateDebts: (opts) =>
			defaultGenerateDebts({ ...opts, amount: 3 }).map((debt, index) => ({
				...debt,
				amount: index === 0 ? 0 : debt.amount,
				currencyCode: index === 0 ? "USD" : "EUR",
			})),
	});
	api.mockFirst(
		"debts.getByPeerPaged",
		({ input: { filters, cursor, limit } }) => {
			const visibleDebts = filters?.showResolved
				? debts
				: debts.filter(({ amount }) => amount !== 0);
			return {
				items: visibleDebts.slice(cursor, cursor + limit).map(({ id }) => id),
				count: visibleDebts.length,
				cursor,
			};
		},
	);
	await page.navigate({
		to: "/debts/peer/$id",
		params: { id: debtPeer.id },
	});
	await expect(showResolvedButton).toBeVisible();
	await expect(debtPreview).toHaveCount(2);
	await showResolvedButton.click();
	await awaitCacheKey("debts.getByPeerPaged", {
		input: {
			cursor: 0,
			limit: 10,
			peerId: debtPeer.id,
			filters: { showResolved: true },
		},
	});
	await expect(debtPreview).toHaveCount(3);
});

test("'debts.remove' mutation", async ({
	page,
	api,
	mockDebts,
	removeDebtsButton,
	awaitCacheKey,
	verifyToastTexts,
	debtCheckbox,
	snapshotQueries,
}) => {
	const {
		debtPeer,
		debts: [firstDebt],
	} = await mockDebts();
	assert.ok(firstDebt);
	await page.navigate({ to: "/debts/peer/$id", params: { id: debtPeer.id } });
	await debtCheckbox.nth(0).check();
	await expect(removeDebtsButton).toBeEnabled();
	const mockErrorMessage = `Mock "debts.remove" error`;
	const removePause = api.createPause();
	api.mockFirst("debts.remove", async () => {
		await removePause.promise;
		throw new TRPCError({ code: "FORBIDDEN", message: mockErrorMessage });
	});
	await snapshotQueries(
		async () => {
			await removeDebtsButton.click();
			await awaitCacheKey("debts.remove", { pending: 1 });
			await verifyToastTexts("Removing debt..");
		},
		{ name: "pending" },
	);
	await snapshotQueries(
		async () => {
			removePause.resolve();
			await awaitCacheKey("debts.remove", { error: 1 });
			await verifyToastTexts(mockErrorMessage);
		},
		{ name: "error" },
	);
	api.mockFirst("debts.remove", { reverseRemoved: false });
	api.mockFirst("debts.getByPeerPaged", async ({ next }) => {
		const prevDebts = await next();
		return {
			...prevDebts,
			items: prevDebts.items.filter((item) => item !== firstDebt.id),
		};
	});
	api.mockFirst("debts.getAllPeer", async ({ next }) => {
		const prevDebts = await next();
		return {
			items: prevDebts.items.map((item) => {
				if (item.currencyCode === firstDebt.currencyCode) {
					return { ...item, sum: item.sum - firstDebt.amount };
				}
				return item;
			}),
		};
	});
	await snapshotQueries(
		async () => {
			await removeDebtsButton.click();
			await awaitCacheKey("debts.remove");
			await verifyToastTexts("Debt removed");
		},
		{ name: "success" },
	);
	await expect(removeDebtsButton).toBeDisabled();
});

test("Pagination loads the next page", async ({
	page,
	api,
	faker,
	mockBase,
	paginationBlock,
	awaitCacheKey,
	snapshotQueries,
}) => {
	const { debtPeer } = await mockBase();
	const generatedDebts = defaultGenerateDebts({
		faker,
		amount: 25,
		peerId: debtPeer.id,
	});
	const ids = generatedDebts.map(({ id }) => id);
	api.mockFirst("debts.getAllPeer", { items: [] });
	api.mockFirst("debts.getByPeerPaged", ({ input: { cursor, limit } }) => ({
		items: ids.slice(cursor, cursor + limit),
		count: ids.length,
		cursor,
	}));
	api.mockFirst("debts.get", ({ input: { id } }) => {
		const debt = generatedDebts.find((item) => item.id === id);
		assert.ok(debt);
		return debt;
	});
	await page.navigate({ to: "/debts/peer/$id", params: { id: debtPeer.id } });
	await awaitCacheKey("debts.getByPeerPaged");
	await expect(paginationBlock).toBeVisible();
	await snapshotQueries(
		async () => {
			await paginationBlock
				.getByRole("button", { name: "pagination item 2" })
				.click();
			await awaitCacheKey("debts.getByPeerPaged", {
				input: {
					cursor: 10,
					limit: 10,
					peerId: debtPeer.id,
					filters: { showResolved: false },
				},
			});
		},
		{ name: "pagination", skipCache: true, skipQueries: true },
	);
});
