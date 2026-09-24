import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as debtsGroupTest } from "~app/components/app/__tests__/debts-group.utils";
import { DEFAULT_LIMIT } from "~app/utils/validation";
import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateDebtIntentions,
	defaultGenerateDebts,
} from "~tests/frontend/generators/debts";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";

import { test as debtsScreenTest } from "./debts-screen.utils";

const test = mergeTests(debtsGroupTest, debtsScreenTest);

test.describe("On load", () => {
	test("with debts", async ({
		page,
		mockDebts,
		debtsGroup,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		await mockDebts();
		await snapshotQueries(
			async () => {
				await page.navigate({ to: "/debts" });

				await expect(page).toHaveTitle("RA - Debts");
				await expect(page.getByRole("heading", { level: 1 })).toHaveText(
					"Debts",
				);
				await expect(debtsGroup.first()).toBeVisible();
				await awaitCacheKey("debts.getPeersPaged");
			},
			{ blacklistKeys: ["peers.get"] },
		);
	});

	test("with no debts", async ({
		page,
		mockDebts,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		await mockDebts({
			generatePeers: (opts) => defaultGeneratePeers({ ...opts, amount: 0 }),
			generateDebts: (opts) => defaultGenerateDebts({ ...opts, amount: 0 }),
		});
		await snapshotQueries(async () => {
			await page.navigate({ to: "/debts" });
			await awaitCacheKey("debts.getPeersPaged");
		});
		await expect(page.getByRole("heading", { level: 3 })).toHaveText(
			"No debts under given filters",
		);
	});
});

test("Show resolved debts toggle filters debts", async ({
	page,
	mockDebts,
	showResolvedDebtsSwitch,
	awaitCacheKey,
	snapshotQueries,
}) => {
	await mockDebts({
		generateDebts: (opts) =>
			defaultGenerateDebts({ ...opts, amount: 3 }).map((debt, index) => ({
				...debt,
				amount: index === 0 ? 0 : debt.amount,
			})),
	});
	await page.navigate({ to: "/debts" });

	await expect(showResolvedDebtsSwitch).toBeVisible();
	await expect(showResolvedDebtsSwitch).not.toBeChecked();

	await snapshotQueries(
		async () => {
			await showResolvedDebtsSwitch.click();
			await awaitCacheKey("debts.getAll");
		},
		{ name: "show-resolved" },
	);

	await expect(showResolvedDebtsSwitch).toBeChecked();

	await snapshotQueries(
		async () => {
			await showResolvedDebtsSwitch.click();
			await awaitCacheKey("debts.getAll");
		},
		{ name: "hide-resolved" },
	);
});

test("Pagination is visible when there are many peers", async ({
	page,
	mockPagedPeers,
	paginationBlock,
	awaitCacheKey,
}) => {
	await mockPagedPeers();

	await page.navigate({ to: "/debts" });
	await awaitCacheKey("debts.getPeersPaged");

	await expect(paginationBlock).toBeVisible();
});

test("Peer with all zero debt sums is hidden", async ({
	page,
	mockDebts,
	awaitCacheKey,
	peerDebtsPreview,
	faker,
}) => {
	const peersAmount = faker.number.int({ min: 4, max: DEFAULT_LIMIT });
	const emptyPeersAmount = faker.number.int({ min: 2, max: peersAmount });
	const { peers } = await mockDebts({
		generatePeers: (opts) =>
			defaultGeneratePeers({ ...opts, amount: peersAmount }),
		generateDebts: (opts) => {
			const peerIndex = opts.peers.findIndex((peer) => peer.id === opts.peerId);
			if (peerIndex < emptyPeersAmount) {
				const [debt] = defaultGenerateDebts({ ...opts, amount: 1 });
				assert.ok(debt);
				return [debt, { ...debt, amount: -debt.amount }];
			}
			return defaultGenerateDebts(opts);
		},
	});
	await page.navigate({ to: "/debts" });
	await awaitCacheKey("debts.getAllPeer", { success: peers.length });
	await expect(peerDebtsPreview).toHaveCount(peersAmount - emptyPeersAmount);
});

test("Loading state shows spinner on page change", async ({
	page,
	api,
	mockPagedPeers,
	paginationBlock,
	loader,
	awaitCacheKey,
	snapshotQueries,
}) => {
	await mockPagedPeers();
	const secondPageInput = {
		limit: 10,
		filters: { showResolved: false },
		cursor: 10,
	};

	await page.navigate({ to: "/debts" });
	await awaitCacheKey("debts.getPeersPaged");
	await expect(paginationBlock).toBeVisible();

	const pause = api.createPause();
	api.mockFirst("debts.getPeersPaged", async ({ next }) => {
		await pause.promise;
		return next();
	});

	await snapshotQueries(
		async () => {
			await paginationBlock
				.getByRole("button", { name: "pagination item 2" })
				.click();
			await awaitCacheKey("debts.getPeersPaged", {
				input: secondPageInput,
				pending: 1,
			});
			await expect(loader).toBeVisible();
			pause.resolve();
			await awaitCacheKey("debts.getPeersPaged", {
				input: secondPageInput,
				success: 1,
			});
			await expect(loader).toBeHidden();
		},
		{ name: "page-2", blacklistKeys: ["peers.get"] },
	);
});

test.describe("Header aside", () => {
	test("Add debt button", async ({ api, page, mockDebts }) => {
		await mockDebts();
		await page.navigate({ to: "/debts" });

		api.mockFirst("currency.top", () => ({ items: [] }));
		api.mockFirst("peers.suggestTop", () => ({ items: [] }));
		await page.getByRole("button", { name: "Add debt" }).click();
		await page.expectUrl({ to: "/debts/add" });
	});

	test("Transfer button", async ({ api, page, mockDebts }) => {
		await mockDebts();
		await page.navigate({ to: "/debts" });

		api.mockFirst("peers.suggestTop", () => ({ items: [] }));
		await page.getByRole("button", { name: "Transfer" }).click();
		await page.expectUrl({ to: "/debts/transfer" });
	});

	test.describe("Debt intentions button", () => {
		test("Navigates", async ({
			page,
			api,
			mockDebts,
			faker,
			awaitCacheKey,
			debtIntentionsButton,
		}) => {
			const {
				peers: [firstPeer],
			} = await mockDebts();
			assert.ok(firstPeer);
			api.mockFirst("debtIntentions.getAll", {
				items: defaultGenerateDebtIntentions({
					faker,
					amount: 6,
					peerId: firstPeer.id,
				}),
			});
			await page.navigate({ to: "/debts" });

			await awaitCacheKey("debtIntentions.getAll");
			await debtIntentionsButton.click();
			await page.expectUrl({ to: "/debts/intentions" });
		});

		test("Disabled when no intentions", async ({
			page,
			api,
			mockDebts,
			awaitCacheKey,
			debtIntentionsButton,
		}) => {
			await mockDebts();
			api.mockFirst("debtIntentions.getAll", { items: [] });
			await page.navigate({ to: "/debts" });

			await awaitCacheKey("debtIntentions.getAll");
			await expect(debtIntentionsButton).toBeDisabled();
		});
	});
});

test("Peer debts preview navigates to peer debts screen", async ({
	page,
	mockDebts,
	peerDebtsPreview,
}) => {
	const {
		peers: [firstPeer],
	} = await mockDebts();
	assert.ok(firstPeer);
	await page.navigate({ to: "/debts" });

	await expect(peerDebtsPreview.first()).toBeVisible();
	await peerDebtsPreview.first().click();

	await page.expectUrl({
		to: "/debts/peer/$id",
		params: { id: firstPeer.id },
	});
});

test("'debts.getPeersPaged' error shows error message", async ({
	page,
	api,
	mockBase,
	errorMessage,
	awaitCacheKey,
	consoleManager,
	snapshotQueries,
}) => {
	await mockBase();
	api.mockFirst("debts.getByPeerPaged", { items: [], count: 0, cursor: 0 });
	const mockErrorMessage = `Mock "getPeersPaged" error`;
	api.mockFirst("debts.getPeersPaged", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: mockErrorMessage,
		});
	});
	consoleManager.ignore(mockErrorMessage);
	api.mockFirst("userSettings.get", { manualAcceptDebts: false });

	await snapshotQueries(
		async () => {
			await page.navigate({ to: "/debts" });
			await awaitCacheKey("debts.getPeersPaged", { error: 1 });
			await expect(errorMessage(mockErrorMessage)).toBeVisible();
		},
		{ name: "error" },
	);
});
