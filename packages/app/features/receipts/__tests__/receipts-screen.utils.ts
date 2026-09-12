import type { Locator } from "@playwright/test";

import type { ExtractFixture } from "~tests/frontend/types";

import { test as receiptsTest } from "./utils";

type Fixtures = {
	mockPagedReceipts: () => Promise<
		Awaited<ReturnType<ExtractFixture<typeof receiptsTest>["mockReceipts"]>>
	>;
	headerAside: Locator;
	filterButton: Locator;
	addReceiptButton: Locator;
	receiptPreview: Locator;
	receiptPreviewNamed: (name: string) => Locator;
	receiptCheckbox: Locator;
	removeReceiptsButton: Locator;
	searchReceiptsInput: Locator;
	emptyItemsBadge: Locator;
	sortToggleButton: Locator;
	ownershipSelect: Locator;
};

export const test = receiptsTest.extend<Fixtures>({
	mockPagedReceipts: ({ mockReceipts }, use) =>
		use(async () => mockReceipts({ amount: 25 })),

	headerAside: ({ page }, use) => use(page.getByTestId("header-aside")),

	filterButton: ({ headerAside, page }, use) =>
		use(
			headerAside
				.getByRole("button")
				.filter({ has: page.getByTestId("filter-icon") }),
		),

	addReceiptButton: ({ headerAside }, use) =>
		use(headerAside.getByRole("button", { name: "Add receipt" })),

	receiptPreview: ({ page }, use) => use(page.getByTestId("receipt-preview")),

	receiptPreviewNamed: ({ receiptPreview }, use) =>
		use((name) => receiptPreview.filter({ hasText: name })),

	receiptCheckbox: ({ receiptPreview }, use) =>
		use(receiptPreview.getByTestId("checkbox")),

	removeReceiptsButton: ({ paginationBlock }, use) =>
		use(paginationBlock.getByTestId("remove-button")),

	searchReceiptsInput: ({ paginationBlock }, use) =>
		use(paginationBlock.getByTestId("search-bar")),

	emptyItemsBadge: ({ receiptPreview }, use) =>
		use(receiptPreview.getByTestId("badge")),

	sortToggleButton: ({ page }, use) =>
		use(page.getByRole("button", { name: /^(?<order>Newest|Oldest) first$/ })),

	ownershipSelect: ({ page }, use) =>
		use(page.getByRole("button", { name: "Owned by me filter" })),
});
