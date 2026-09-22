import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as debtsTest } from "~app/features/debts/__tests__/utils";
import { formatCurrency } from "~app/utils/currency";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";
import { generateCurrencyCode } from "~tests/frontend/generators/utils";

import { test as debtsGroupFixture } from "./debts-group.utils";

const test = mergeTests(debtsTest, debtsGroupFixture);

const criticalPaths = ["debts.getByPeerPaged", "debts.getAllPeer"] as const;
for (const path of criticalPaths) {
	const otherPaths = criticalPaths.filter((lookupPath) => lookupPath !== path);

	test.describe(`'${path}' query`, () => {
		test("errors", async ({
			api,
			mockDebts,
			openPeerDebtsScreen,
			snapshotQueries,
			errorMessage,
			awaitCacheKey,
			consoleManager,
		}) => {
			const {
				peers: [firstPeer],
			} = await mockDebts({
				generatePeers: (opts) => defaultGeneratePeers({ ...opts, amount: 1 }),
				generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 3 }),
			});
			assert.ok(firstPeer);
			const pathErrorMessage = `Mock "${path}" error`;
			const unmockError = api.mockFirst(path, () => {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: pathErrorMessage,
				});
			});
			consoleManager.ignore(pathErrorMessage);
			const getAllPeerErrorLocator = errorMessage(pathErrorMessage).first();
			await snapshotQueries(
				async () => {
					await openPeerDebtsScreen(firstPeer.id, { awaitCache: false });
					await awaitCacheKey(path, { error: 1 });
					await expect(getAllPeerErrorLocator).toBeVisible();
				},
				{
					name: `${path}-errors`,
					blacklistKeys: otherPaths,
				},
			);
			unmockError();
			await snapshotQueries(
				async () => {
					await getAllPeerErrorLocator
						.locator("button", { hasText: "Refetch" })
						.click();
					await awaitCacheKey(path, { success: 1 });
					await Promise.all(
						otherPaths.map((anotherPath) =>
							awaitCacheKey(anotherPath, { success: 1 }),
						),
					);
				},
				{
					name: `${path}-refetch`,
					blacklistKeys: ["debts.get", "peers.get", ...otherPaths],
				},
			);
		});
	});
}

test("Empty state", async ({ mockDebts, openPeerDebtsScreen, debtsGroup }) => {
	const {
		peers: [firstPeer],
	} = await mockDebts({
		generateDebts: () => [],
	});
	assert.ok(firstPeer);
	await openPeerDebtsScreen(firstPeer.id);
	await expect(debtsGroup).toHaveText("No debts yet");
});

test("All resolved debts shows the resolved message", async ({
	mockDebts,
	openPeerDebtsScreen,
	debtsGroup,
	faker,
}) => {
	const currencyCode = generateCurrencyCode(faker);
	const {
		peers: [firstPeer],
	} = await mockDebts({
		generatePeers: (opts) => defaultGeneratePeers({ ...opts, amount: 1 }),
		generateDebts: ({ peerId, ...opts }) =>
			defaultGenerateDebts({ ...opts, amount: 2, peerId }).map(
				(debt, index) => ({
					...debt,
					amount: index === 0 ? 100 : -100,
					currencyCode,
				}),
			),
	});
	assert.ok(firstPeer);
	await openPeerDebtsScreen(firstPeer.id);
	await expect(debtsGroup).toHaveText("All debts are resolved!");
});

test("Rounding", async ({
	mockDebts,
	openPeerDebtsScreen,
	debtsGroupElement,
}) => {
	const {
		peers: [firstPeer],
	} = await mockDebts({
		generatePeers: (opts) => defaultGeneratePeers({ ...opts, amount: 1 }),
		generateDebts: (opts) => {
			const [debt] = defaultGenerateDebts(opts);
			assert.ok(debt);
			return [
				{
					...debt,
					id: `${debt.id.slice(0, -1)}a`,
					currencyCode: "USD",
					amount: 1.234,
				},
				{
					...debt,
					id: `${debt.id.slice(0, -1)}b`,
					currencyCode: "EUR",
					amount: 1.235,
				},
			];
		},
	});
	assert.ok(firstPeer);
	await openPeerDebtsScreen(firstPeer.id, { awaitDebts: 2 });

	await expect(debtsGroupElement.first()).toHaveText(
		formatCurrency(localSettings.locale, "USD", 1.23),
	);
	await expect(debtsGroupElement.last()).toHaveText(
		formatCurrency(localSettings.locale, "EUR", 1.24),
	);
});
