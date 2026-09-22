import { mergeTests } from "@playwright/test";
import assert from "node:assert";

import { test as debtsGroupFixture } from "~app/components/app/__tests__/debts-group.utils";
import { test as peerFixture } from "~app/components/app/__tests__/peer.utils";

import { test as localTest } from "./utils";

const test = mergeTests(localTest, debtsGroupFixture, peerFixture);

test.describe("Screen", () => {
	test("Default", async ({
		mockDebts,
		page,
		expectScreenshotWithSchemes,
		peer: peerSelector,
		debtsGroup,
		currenciesGroup,
		awaitCacheKey,
		plannedDebtsForm,
	}) => {
		const { debtPeer } = await mockDebts();
		await page.navigate({
			to: "/debts/peer/$id/exchange/all",
			params: { id: debtPeer.id },
		});
		await awaitCacheKey("debts.getAllPeer");
		await expectScreenshotWithSchemes("screen/default.png", {
			mask: [debtsGroup, peerSelector, currenciesGroup, plannedDebtsForm],
		});
	});

	test("Screen with planned debts", async ({
		mockDebts,
		page,
		expectScreenshotWithSchemes,
		peer: peerSelector,
		debtsGroup,
		currenciesGroup,
		awaitCacheKey,
		plannedDebtsForm,
	}) => {
		const { debtPeer, debts } = await mockDebts();
		assert.ok(debts[0]);
		await page.navigate({
			to: "/debts/peer/$id/exchange/all",
			params: { id: debtPeer.id },
			search: { from: debts[0].currencyCode },
		});
		await awaitCacheKey("currency.rates");
		await expectScreenshotWithSchemes("screen/with-selected-code.png", {
			mask: [debtsGroup, peerSelector, currenciesGroup, plannedDebtsForm],
		});
	});
});

test.describe("Currencies group", () => {
	test("Default", async ({
		mockDebts,
		page,
		expectScreenshotWithSchemes,
		currenciesGroup,
		awaitCacheKey,
	}) => {
		const { debtPeer } = await mockDebts();
		await page.navigate({
			to: "/debts/peer/$id/exchange/all",
			params: { id: debtPeer.id },
		});
		await awaitCacheKey("debts.getAllPeer");
		await expectScreenshotWithSchemes("currencies-group/default.png", {
			locator: currenciesGroup,
		});
	});

	test("With selected currency", async ({
		page,
		mockDebts,
		expectScreenshotWithSchemes,
		currenciesGroup,
		awaitCacheKey,
	}) => {
		const { debtPeer, debts } = await mockDebts();
		assert.ok(debts[0]);
		await page.navigate({
			to: "/debts/peer/$id/exchange/all",
			params: { id: debtPeer.id },
			search: { from: debts[0].currencyCode },
		});
		await awaitCacheKey("currency.rates");
		await expectScreenshotWithSchemes("currencies-group/selected.png", {
			locator: currenciesGroup,
		});
	});

	test("Skeleton", async ({
		page,
		api,
		mockDebts,
		expectScreenshotWithSchemes,
		currenciesGroupSkeleton,
	}) => {
		// oxlint-disable-next-line playwright/no-skipped-test
		test.skip(
			true,
			"We prefetch this query completely so loading state will hang it forever",
		);
		const { debtPeer } = await mockDebts();
		const debtsPause = api.createPause();
		api.mockFirst("debts.getAllPeer", async ({ next }) => {
			await debtsPause.promise;
			return next();
		});
		await page.navigate({
			to: "/debts/peer/$id/exchange/all",
			params: { id: debtPeer.id },
		});
		await expectScreenshotWithSchemes("currencies-group/loading.png", {
			locator: currenciesGroupSkeleton,
		});
	});
});
