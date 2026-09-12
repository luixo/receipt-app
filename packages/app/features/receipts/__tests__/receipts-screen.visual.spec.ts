import { TRPCError } from "@trpc/server";

import { DEFAULT_LIMIT } from "~app/utils/validation";
import type { UserId } from "~db/ids";
import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateDebtsFromReceipt,
	ourDesynced,
	ourSynced,
	remapDebts,
	theirNonExistent,
	theirSynced,
} from "~tests/frontend/generators/debts";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptBase,
	defaultGenerateReceiptItems,
	defaultGenerateReceiptParticipants,
} from "~tests/frontend/generators/receipts";
import { getNow } from "~utils/date";

import { test } from "./receipts-screen.utils";

test("Full screen", async ({
	mockReceipts,
	openReceiptsScreen,
	awaitCacheKey,
	expectScreenshotWithSchemes,
	faker,
}) => {
	const foreignOwnerId = faker.string.uuid() as UserId;
	const names = [
		"Synced receipt",
		"Unsynced receipt",
		"Foreign desynced receipt",
		"Empty receipt",
	] as const;
	const { receipts, debts } = await mockReceipts({
		amount: 4,
		generateReceiptBase: (opts) => {
			const defaultReceiptBase = defaultGenerateReceiptBase(opts);
			return {
				...defaultReceiptBase,
				name: names[opts.index ?? -1] ?? defaultReceiptBase.name,
			};
		},
		generateDebts: (opts) => {
			const defaultDebtsFromReceipt = defaultGenerateDebtsFromReceipt(opts);
			if (opts.index === 0) {
				return remapDebts(ourSynced, theirSynced)(defaultDebtsFromReceipt);
			}
			if (opts.index === 1) {
				return remapDebts(
					ourDesynced,
					theirNonExistent,
				)(defaultDebtsFromReceipt);
			}
			if (opts.index === 2) {
				return remapDebts(ourDesynced, theirSynced)(defaultDebtsFromReceipt);
			}
			return defaultDebtsFromReceipt;
		},
		generateReceipt: (opts) => {
			const defaultReceipt = defaultGenerateReceipt(opts);
			if (opts.index === 2) {
				return {
					...defaultReceipt,
					ownerUserId: foreignOwnerId,
				};
			}
			return defaultReceipt;
		},
		generateReceiptParticipants: (opts) => {
			if (opts.index === 2) {
				return [
					{
						userId: opts.selfUserId,
						role: "editor" as const,
						createdAt: getNow.zonedDateTime(),
					},
				];
			}
			return defaultGenerateReceiptParticipants(opts);
		},
		generateReceiptItems: (opts) =>
			opts.index === 3 ? [] : defaultGenerateReceiptItems(opts),
	});
	await openReceiptsScreen({ awaitReceipts: receipts.length });
	await awaitCacheKey("debts.get", debts.length);
	await expectScreenshotWithSchemes("full-screen.png");
});

test("Full screen with no receipts", async ({
	mockReceipts,
	openReceiptsScreen,
	awaitCacheKey,
	expectScreenshotWithSchemes,
}) => {
	await mockReceipts({ amount: 0 });
	await openReceiptsScreen();
	await awaitCacheKey("receipts.getPaged");
	await expectScreenshotWithSchemes("empty.png");
});

test("No results with filters", async ({
	mockReceipts,
	openReceiptsScreen,
	searchReceiptsInput,
	emptyCard,
	awaitCacheKey,
	expectScreenshotWithSchemes,
}) => {
	await mockReceipts();
	await openReceiptsScreen();

	const query = "non-existing-receipt";
	await searchReceiptsInput.fill(query);
	await awaitCacheKey("receipts.getPaged", {
		input: {
			limit: DEFAULT_LIMIT,
			orderBy: "date-desc",
			filters: { query },
			cursor: 0,
		},
	});
	await expect(emptyCard("You have no receipts")).toBeVisible();
	await expectScreenshotWithSchemes("no-results.png");
});

test("Filter modal", async ({
	mockReceipts,
	openReceiptsScreen,
	filterButton,
	modal,
	expectScreenshotWithSchemes,
}) => {
	await mockReceipts();
	await openReceiptsScreen();

	await filterButton.click();
	await expect(modal()).toBeVisible();
	await expectScreenshotWithSchemes("filter-modal.png", {
		locator: modal(),
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [16, 16],
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Remove confirm modal", async ({
	mockReceipts,
	openReceiptsScreen,
	receiptCheckbox,
	removeReceiptsButton,
	modal,
	expectScreenshotWithSchemes,
}, testInfo) => {
	// oxlint-disable-next-line playwright/no-skipped-test
	test.skip(
		testInfo.project.name === "1280-firefox",
		"Checkboxes do not work in firefox (only in CI!) for unknown reason",
	);
	const { receipts } = await mockReceipts();
	await openReceiptsScreen({ awaitReceipts: receipts.length });

	await receiptCheckbox.nth(1).click();
	await receiptCheckbox.nth(2).click();
	await removeReceiptsButton.click();
	await expect(modal()).toBeVisible();
	await expectScreenshotWithSchemes("remove-confirm.png", {
		locator: modal(),
		mapExpectedPixels: ({ expectedPixels, colorMode }) => [
			{
				rgb: colorMode === "light" ? "#ffffff" : "#18181b",
				location: [16, 16],
			},
			...expectedPixels.slice(1),
		],
	});
});

test("Loading state", async ({
	api,
	mockReceipts,
	openReceiptsScreen,
	searchReceiptsInput,
	skeleton,
	expectScreenshotWithSchemes,
	suspendedOverlay,
	paginationBlock,
}) => {
	const { receipts } = await mockReceipts();
	await openReceiptsScreen({ awaitReceipts: receipts.length });

	const pause = api.createPause();
	api.mockFirst("receipts.getPaged", async ({ input, next }) => {
		if (input.filters?.query) {
			await pause.promise;
		}
		return next();
	});

	await searchReceiptsInput.fill("bread");
	await expect(skeleton.first()).toBeVisible();
	await expectScreenshotWithSchemes("loading.png", {
		locator: [suspendedOverlay, paginationBlock],
	});
	pause.resolve();
});

test("Error state", async ({
	page,
	api,
	mockBase,
	expectScreenshotWithSchemes,
	errorMessage,
	awaitCacheKey,
	consoleManager,
}) => {
	await mockBase();
	const mockErrorMessage = `Mock "getPaged" error`;
	api.mockFirst("receipts.getPaged", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: mockErrorMessage,
		});
	});
	consoleManager.ignore(mockErrorMessage);

	await page.navigate({ to: "/receipts" });
	await awaitCacheKey("receipts.getPaged", { error: 1 });

	await expect(errorMessage(mockErrorMessage)).toBeVisible();
	await expectScreenshotWithSchemes("error.png");
});
