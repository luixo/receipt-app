import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { formatCurrency } from "~app/utils/currency";
import { DEFAULT_LIMIT, LIMITS } from "~app/utils/validation";
import type { UserId } from "~db/ids";
import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptBase,
	defaultGenerateReceiptItemsWithConsumers,
} from "~tests/frontend/generators/receipts";
import { generateAmount } from "~tests/frontend/generators/utils";
import { round } from "~utils/math";

import { test } from "./receipts-screen.utils";

test.describe("On load", () => {
	test("with receipts", async ({
		page,
		mockReceipts,
		openReceiptsScreen,
		snapshotQueries,
		receiptPreviewNamed,
	}) => {
		const { receipts } = await mockReceipts();
		await snapshotQueries(
			async () => {
				await openReceiptsScreen({ awaitReceipts: receipts.length });

				await expect(page).toHaveTitle("RA - Receipts");
				await expect(page.getByRole("heading", { level: 1 })).toHaveText(
					"Receipts",
				);
				await expect(page.getByText("Receipt", { exact: true })).toBeVisible();
				await expect(page.getByText("Sum", { exact: true })).toBeVisible();
				for (const receipt of receipts) {
					await expect(receiptPreviewNamed(receipt.name)).toBeVisible();
				}
			},
			{ blacklistKeys: ["users.get", "users.getForeign"] },
		);
	});

	test("with no receipts", async ({
		page,
		mockReceipts,
		openReceiptsScreen,
		snapshotQueries,
	}) => {
		await mockReceipts({ amount: 0 });
		await snapshotQueries(async () => {
			await openReceiptsScreen();
		});
		await expect(page.getByRole("heading", { level: 3 })).toHaveText(
			"No receipts under given filters",
		);
	});
});

test.describe("Header aside", () => {
	test("Add receipt button navigates", async ({
		page,
		mockReceipts,
		openReceiptsScreen,
		addReceiptButton,
	}) => {
		await mockReceipts();
		await openReceiptsScreen();

		await addReceiptButton.click();
		await page.expectUrl({ to: "/receipts/add" });
	});

	test("Filter button opens filters modal", async ({
		mockReceipts,
		openReceiptsScreen,
		filterButton,
		modal,
		sortToggleButton,
		ownershipSelect,
	}) => {
		await mockReceipts();
		await openReceiptsScreen();

		await filterButton.click();
		await expect(modal()).toBeVisible();
		await expect(modal().getByText("Filters")).toBeVisible();
		await expect(sortToggleButton).toHaveText("Newest first");
		await expect(ownershipSelect).toHaveText("Owned by anybody");
	});
});

test.describe("Sorting and filters", () => {
	test("Sort toggle refetches with reversed order", async ({
		mockReceipts,
		openReceiptsScreen,
		filterButton,
		sortToggleButton,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		await mockReceipts();
		await openReceiptsScreen();

		await filterButton.click();
		await expect(sortToggleButton).toHaveText("Newest first");

		await snapshotQueries(
			async () => {
				await sortToggleButton.click();
				await awaitCacheKey("receipts.getPaged", {
					input: {
						limit: DEFAULT_LIMIT,
						orderBy: "date-asc",
						filters: {},
						cursor: 0,
					},
				});
			},
			{ name: "oldest-first" },
		);
		await expect(sortToggleButton).toHaveText("Oldest first");

		await snapshotQueries(
			async () => {
				await sortToggleButton.click();
				await awaitCacheKey("receipts.getPaged", {
					input: {
						limit: DEFAULT_LIMIT,
						orderBy: "date-desc",
						filters: {},
						cursor: 0,
					},
				});
			},
			{ name: "newest-first" },
		);
		await expect(sortToggleButton).toHaveText("Newest first");
	});

	test("Ownership filter shows only own or foreign receipts", async ({
		page,
		mockReceipts,
		openReceiptsScreen,
		filterButton,
		modal,
		ownershipSelect,
		awaitCacheKey,
		snapshotQueries,
		faker,
		receiptPreviewNamed,
	}) => {
		const foreignOwnerId = faker.string.uuid() as UserId;
		const { receipts } = await mockReceipts({
			amount: 3,
			generateReceipt: (opts) => {
				const defaultReceipt = defaultGenerateReceipt(opts);
				if (opts.index === 0) {
					return {
						...defaultReceipt,
						ownerUserId: foreignOwnerId,
					};
				}
				return defaultReceipt;
			},
		});
		const [foreignReceipt, ...ownReceipts] = receipts;
		assert.ok(foreignReceipt);
		await openReceiptsScreen({ awaitReceipts: receipts.length });

		await filterButton.click();
		await ownershipSelect.click();
		await snapshotQueries(
			async () => {
				await page.getByText("Owned by me", { exact: true }).click();
				await awaitCacheKey("receipts.getPaged", {
					input: {
						limit: DEFAULT_LIMIT,
						orderBy: "date-desc",
						filters: { ownedByMe: true },
						cursor: 0,
					},
				});
			},
			{ name: "owned-by-me" },
		);
		await page.keyboard.press("Escape");
		await expect(modal()).toBeHidden();
		assert.ok(ownReceipts.length !== 0);
		for (const receipt of ownReceipts) {
			await expect(receiptPreviewNamed(receipt.name)).toBeVisible();
		}
		await expect(receiptPreviewNamed(foreignReceipt.name)).toBeHidden();

		await filterButton.click();
		await ownershipSelect.click();
		await snapshotQueries(
			async () => {
				await page
					.getByText("Owned by anybody but me", { exact: true })
					.click();
				await awaitCacheKey("receipts.getPaged", {
					input: {
						limit: 10,
						orderBy: "date-desc",
						filters: { ownedByMe: false },
						cursor: 0,
					},
				});
			},
			{ name: "owned-not-by-me" },
		);
		await page.keyboard.press("Escape");
		await expect(modal()).toBeHidden();
		await expect(receiptPreviewNamed(foreignReceipt.name)).toBeVisible();
		for (const receipt of ownReceipts) {
			await expect(receiptPreviewNamed(receipt.name)).toBeHidden();
		}
	});

	test("Search filters receipts by name", async ({
		page,
		mockReceipts,
		openReceiptsScreen,
		searchReceiptsInput,
		awaitCacheKey,
		snapshotQueries,
		faker,
		receiptPreviewNamed,
	}) => {
		const names = generateAmount(faker, { min: 5, max: 10 }, () =>
			faker.commerce.productName(),
		);
		assert.ok(names[0]);
		const [query] = names[0].split(" ");
		assert.ok(query);
		const { receipts } = await mockReceipts({
			amount: 3,
			generateReceiptBase: (opts) => {
				const defaultReceiptBase = defaultGenerateReceiptBase(opts);
				return {
					...defaultReceiptBase,
					name: names[opts.index ?? -1] ?? "Unexpected",
				};
			},
		});
		await openReceiptsScreen({ awaitReceipts: receipts.length });

		await snapshotQueries(
			async () => {
				await searchReceiptsInput.fill("bread");
				await awaitCacheKey("receipts.getPaged", {
					input: {
						limit: DEFAULT_LIMIT,
						orderBy: "date-desc",
						filters: { query: "bread" },
						cursor: 0,
					},
				});
			},
			{ blacklistKeys: ["users.get", "users.getForeign"] },
		);
		const visibleNames = names.filter((name) =>
			name.toLowerCase().includes(query),
		);
		for (const visibleName of visibleNames) {
			await expect(receiptPreviewNamed(visibleName)).toBeVisible();
		}
		for (const invisibleName of names.filter(
			(name) => !visibleNames.includes(name),
		)) {
			await expect(receiptPreviewNamed(invisibleName)).toBeHidden();
		}
	});

	test("Search with no matches shows empty card with add button", async ({
		page,
		mockReceipts,
		openReceiptsScreen,
		searchReceiptsInput,
		emptyCard,
		awaitCacheKey,
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
		await emptyCard("You have no receipts")
			.getByRole("button", { name: "Add receipt" })
			.click();
		await page.expectUrl({ to: "/receipts/add" });
	});
});

test.describe("Pagination", () => {
	test("Pagination is visible when there are many receipts", async ({
		mockPagedReceipts,
		openReceiptsScreen,
		paginationBlock,
	}) => {
		await mockPagedReceipts();
		await openReceiptsScreen({ awaitReceipts: DEFAULT_LIMIT });
		await expect(paginationBlock).toBeVisible();
	});

	test("Loading state shows spinner on page change", async ({
		api,
		mockPagedReceipts,
		openReceiptsScreen,
		paginationBlock,
		loader,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		await mockPagedReceipts();
		const secondPageInput = {
			limit: DEFAULT_LIMIT,
			orderBy: "date-desc",
			filters: {},
			cursor: DEFAULT_LIMIT,
		} as const;

		await openReceiptsScreen({ awaitReceipts: DEFAULT_LIMIT });
		await expect(paginationBlock).toBeVisible();

		const pause = api.createPause();
		api.mockFirst("receipts.getPaged", async ({ next }) => {
			await pause.promise;
			return next();
		});

		await snapshotQueries(
			async () => {
				await paginationBlock
					.getByRole("button", { name: "pagination item 2" })
					.click();
				await awaitCacheKey("receipts.getPaged", {
					input: secondPageInput,
					pending: 1,
				});
				await expect(loader).toBeVisible();
				pause.resolve();
				await awaitCacheKey("receipts.getPaged", {
					input: secondPageInput,
					success: 1,
				});
				await expect(loader).toBeHidden();
			},
			{ name: "page-2", blacklistKeys: ["users.get", "users.getForeign"] },
		);
	});

	test("Limit change refetches with new limit", async ({
		page,
		mockPagedReceipts,
		openReceiptsScreen,
		paginationBlock,
		awaitCacheKey,
		snapshotQueries,
		receiptPreviewNamed,
	}) => {
		const { receipts } = await mockPagedReceipts();
		const firstReceipt = receipts.at(0);
		const lastReceipt = receipts.at(-1);
		assert.ok(firstReceipt);
		assert.ok(lastReceipt);
		await openReceiptsScreen({ awaitReceipts: DEFAULT_LIMIT });
		await expect(paginationBlock).toBeVisible();
		const firstReceiptPreview = receiptPreviewNamed(firstReceipt.name);
		await expect(firstReceiptPreview).toBeVisible();
		const lastReceiptPreview = receiptPreviewNamed(lastReceipt.name);
		await expect(lastReceiptPreview).toBeHidden();

		const limitSelect = page.getByRole("button", { name: "Items per page" });
		await limitSelect.click();
		await snapshotQueries(
			async () => {
				const [, secondLimit] = LIMITS;
				assert.ok(secondLimit);
				await page
					.getByRole("option", { name: secondLimit.toString(), exact: true })
					.click();
				await awaitCacheKey("receipts.getPaged", {
					input: {
						limit: secondLimit,
						orderBy: "date-desc",
						filters: {},
						cursor: 0,
					},
				});
			},
			{ blacklistKeys: ["users.get", "users.getForeign", "receipts.get"] },
		);
		await expect(lastReceiptPreview).toBeVisible();
	});
});

test.describe("Selection and removal", () => {
	test("Remove button is disabled without selection", async ({
		mockReceipts,
		openReceiptsScreen,
		removeReceiptsButton,
	}) => {
		await mockReceipts();
		await openReceiptsScreen();
		await expect(removeReceiptsButton).toBeDisabled();
	});

	test("Select-all checkbox toggles all receipts", async ({
		mockReceipts,
		openReceiptsScreen,
		paginationBlock,
		removeReceiptsButton,
		receiptCheckbox,
	}) => {
		const { receipts } = await mockReceipts();
		await openReceiptsScreen({ awaitReceipts: receipts.length });

		await paginationBlock.getByRole("checkbox").click();
		for (const [index] of receipts.entries()) {
			await expect(receiptCheckbox.nth(index)).toBeChecked();
		}
		await expect(removeReceiptsButton).toBeEnabled();

		await paginationBlock.getByRole("checkbox").click();
		for (const [index] of receipts.entries()) {
			await expect(receiptCheckbox.nth(index)).not.toBeChecked();
		}
		await expect(removeReceiptsButton).toBeDisabled();
	});

	test.fixme("Single receipt is removed without confirm", async ({
		api,
		mockReceipts,
		openReceiptsScreen,
		receiptCheckbox,
		removeReceiptsButton,
		modal,
		verifyToastTexts,
		awaitCacheKey,
		snapshotQueries,
		receiptPreviewNamed,
	}) => {
		const { receipts } = await mockReceipts();
		const [firstReceipt, ...restReceipts] = receipts;
		assert.ok(firstReceipt);
		await openReceiptsScreen({ awaitReceipts: receipts.length });

		await receiptCheckbox.first().click();
		await expect(removeReceiptsButton).toBeEnabled();

		const pause = api.createPause();
		api.mockFirst("receipts.remove", async () => {
			await pause.promise;
		});

		await snapshotQueries(
			async () => {
				await removeReceiptsButton.click();
				await expect(modal()).toBeHidden();
				await awaitCacheKey("receipts.remove", { pending: 1 });
				await expect(receiptCheckbox.first()).toBeDisabled();
				await expect(removeReceiptsButton).toBeDisabled();
				await verifyToastTexts("Removing receipt..");
				pause.resolve();
				await awaitCacheKey("receipts.remove", { success: 1 });
				await verifyToastTexts("Receipt removed");
			},
			{ blacklistKeys: ["users.get", "users.getForeign"] },
		);
		await expect(receiptPreviewNamed(firstReceipt.name)).toBeHidden();
		for (const receipt of restReceipts) {
			await expect(receiptPreviewNamed(receipt.name)).toBeVisible();
		}
	});

	test.fixme("Multiple receipts are removed with confirm", async ({
		api,
		mockReceipts,
		openReceiptsScreen,
		receiptCheckbox,
		removeReceiptsButton,
		modal,
		verifyToastTexts,
		awaitCacheKey,
		snapshotQueries,
		receiptPreviewNamed,
	}) => {
		const { receipts } = await mockReceipts();
		const [firstReceipt, secondReceipt] = receipts;
		assert.ok(firstReceipt);
		assert.ok(secondReceipt);
		await openReceiptsScreen({ awaitReceipts: receipts.length });

		await receiptCheckbox.nth(0).click();
		await receiptCheckbox.nth(1).click();

		api.mockFirst("receipts.remove", undefined);

		await removeReceiptsButton.click();
		await expect(modal()).toBeVisible();
		await expect(modal().getByText("Are you sure?")).toBeVisible();
		const yesButton = modal().getByRole("button", { name: "Yes" });
		const noButton = modal().getByRole("button", { name: "No" });

		await noButton.click();
		await expect(modal()).toBeHidden();
		await expect(receiptPreviewNamed(firstReceipt.name)).toBeVisible();

		const pause = api.createPause();
		api.mockFirst("receipts.remove", async ({ next }) => {
			await pause.promise;
			return next();
		});
		await snapshotQueries(
			async () => {
				await removeReceiptsButton.click();
				await yesButton.click();
				await awaitCacheKey("receipts.remove", { pending: 2 });
				await verifyToastTexts("Removing 2 receipts..");
				pause.resolve();
				await awaitCacheKey("receipts.remove", { success: 2 });
				await verifyToastTexts("2 receipts removed");
			},
			{ blacklistKeys: ["users.get", "users.getForeign"] },
		);
		await expect(receiptPreviewNamed(firstReceipt.name)).toBeHidden();
		await expect(receiptPreviewNamed(secondReceipt.name)).toBeHidden();
	});

	test("'receipts.remove' error shows error toast", async ({
		page,
		api,
		mockReceipts,
		openReceiptsScreen,
		receiptCheckbox,
		removeReceiptsButton,
		verifyToastTexts,
		awaitCacheKey,
		consoleManager,
		snapshotQueries,
		receiptPreviewNamed,
	}) => {
		const { receipts } = await mockReceipts();
		const [firstReceipt] = receipts;
		assert.ok(firstReceipt);
		await openReceiptsScreen({ awaitReceipts: receipts.length });

		await receiptCheckbox.first().click();

		const mockErrorMessage = `Mock "receipts.remove" error`;
		api.mockFirst("receipts.remove", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: mockErrorMessage,
			});
		});
		consoleManager.ignore(mockErrorMessage);

		await snapshotQueries(
			async () => {
				await removeReceiptsButton.click();
				await awaitCacheKey("receipts.remove", { error: 1 });
				await verifyToastTexts(mockErrorMessage);
			},
			{ name: "error" },
		);
		await expect(receiptPreviewNamed(firstReceipt.name)).toBeVisible();
	});
});

test.describe("Receipt preview", () => {
	test("Preview shows name, sum and owner key", async ({
		page,
		mockReceipts,
		openReceiptsScreen,
		receiptPreviewNamed,
	}) => {
		const { receipts } = await mockReceipts({
			amount: 3,
			generateReceipt: (opts) => {
				const defaultReceipt = defaultGenerateReceipt(opts);
				const [firstUser] = opts.users;
				assert.ok(firstUser);
				return opts.index === 0
					? {
							...defaultReceipt,
							ownerUserId: firstUser.id,
							debts: {
								direction: "incoming",
								id: undefined,
								hasMine: false,
								hasForeign: false,
							},
						}
					: defaultReceipt;
			},
		});
		const [firstReceipt] = receipts;
		assert.ok(firstReceipt);
		await openReceiptsScreen({ awaitReceipts: receipts.length });

		for (const receipt of receipts) {
			const sum = round(
				receipt.items.reduce(
					(acc, item) => acc + item.price * item.quantity,
					0,
				),
			);
			await expect(receiptPreviewNamed(receipt.name)).toBeVisible();
			await expect(
				page.getByText(formatCurrency("en-US", receipt.currencyCode, sum)),
			).toBeVisible();
		}
		await expect(page.getByTestId("key-icon")).toHaveCount(2);
		const firstReceiptLink = receiptPreviewNamed(firstReceipt.name);
		await firstReceiptLink.click();
		await page.expectUrl({
			to: "/receipts/$id",
			params: { id: firstReceipt.id },
		});
	});

	test("Receipt with undistributed items shows empty items tooltip", async ({
		mockReceipts,
		openReceiptsScreen,
		emptyItemsBadge,
		expectTooltip,
		receiptPreviewNamed,
	}) => {
		const { receipts } = await mockReceipts({
			amount: 1,
			generateReceiptItemsWithConsumers: (opts) => {
				const [first, ...rest] = defaultGenerateReceiptItemsWithConsumers(opts);
				assert.ok(first);
				return [{ ...first, consumers: [] }, ...rest];
			},
		});
		const [receipt] = receipts;
		assert.ok(receipt);
		await openReceiptsScreen({ awaitReceipts: 1 });
		await expect(receiptPreviewNamed(receipt.name)).toBeVisible();
		await expect(emptyItemsBadge).toBeVisible();
		await expectTooltip(emptyItemsBadge, "1 empty item(s)");
	});

	test("Receipt with matched items shows info tooltip", async ({
		page,
		api,
		mockReceipts,
		openReceiptsScreen,
		searchReceiptsInput,
		awaitCacheKey,
		faker,
		expectTooltip,
	}) => {
		const { receipts } = await mockReceipts({ amount: 1 });
		const [receipt] = receipts;
		assert.ok(receipt);
		const [firstItem] = receipt.items;
		assert.ok(firstItem);
		api.mockFirst("receipts.getPaged", ({ input }) => ({
			count: 1,
			cursor: input.cursor,
			items: [
				{
					id: receipt.id,
					highlights: [[0, 4]],
					matchedItems: [
						{ id: firstItem.id, highlights: [] },
						{ id: faker.string.uuid(), highlights: [] },
					],
				},
			],
		}));
		await openReceiptsScreen({ awaitReceipts: 1 });

		await searchReceiptsInput.fill("whatever");
		await awaitCacheKey("receipts.getPaged", {
			input: {
				limit: DEFAULT_LIMIT,
				orderBy: "date-desc",
				filters: { query: "whatever" },
				cursor: 0,
			},
		});

		const infoIcon = page.getByTestId("info-icon");
		await expect(infoIcon).toBeVisible();
		await page.mouse.click(0, 0);
		await infoIcon.hover();
		await expectTooltip(
			infoIcon,
			["- Fresh Plastic Salad", "Matched item not found"].join(""),
		);
	});
});

test("'receipts.getPaged' error shows error message", async ({
	page,
	api,
	mockBase,
	errorMessage,
	awaitCacheKey,
	consoleManager,
	snapshotQueries,
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

	await snapshotQueries(
		async () => {
			await page.navigate({ to: "/receipts" });
			await awaitCacheKey("receipts.getPaged", { error: 1 });
			await expect(errorMessage(mockErrorMessage)).toBeVisible();
		},
		{ name: "error" },
	);
});
