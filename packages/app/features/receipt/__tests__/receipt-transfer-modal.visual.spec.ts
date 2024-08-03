import assert from "node:assert";

import { defaultGenerateReceipt, defaultGenerateUsers } from "./generators";
import { test } from "./receipt-transfer-modal.utils.spec";

test.describe("Modal button", () => {
	test("Intention does not exist", async ({
		page,
		mockReceipt,
		transferReceiptButton,
		expectScreenshotWithSchemes,
		skip,
	}, testInfo) => {
		skip(testInfo, "only-smallest");
		const { receipt } = mockReceipt();
		await page.goto(`/receipts/${receipt.id}`);
		await expectScreenshotWithSchemes("button/no-intention.png", {
			locator: transferReceiptButton,
		});
	});

	test("Intention exists", async ({
		page,
		mockReceipt,
		transferReceiptButton,
		expectScreenshotWithSchemes,
		skip,
	}, testInfo) => {
		skip(testInfo, "only-smallest");
		const { receipt } = mockReceipt({
			generateReceipt: (opts) => {
				const firstUser = opts.users[0];
				assert(firstUser);
				return {
					...defaultGenerateReceipt(opts),
					transferIntentionUserId: firstUser.id,
				};
			},
		});
		await page.goto(`/receipts/${receipt.id}`);
		await expectScreenshotWithSchemes("button/intention.png", {
			locator: transferReceiptButton,
		});
	});
});

test.describe("Modal", () => {
	test("Intention does not exist", async ({
		api,
		page,
		mockReceipt,
		transferReceiptButton,
		expectScreenshotWithSchemes,
		selectSuggestUser,
		modal,
		user,
	}) => {
		const { receipt, users } = mockReceipt({
			generateUsers: (opts) =>
				defaultGenerateUsers(opts).map((generatedUser) => ({
					...generatedUser,
					connectedAccount: {
						id: opts.faker.string.uuid(),
						email: opts.faker.internet.email(),
					},
				})),
			generateReceiptParticipants: () => [],
		});
		api.mock("users.suggestTop", { items: users.map(({ id }) => id) });
		await page.goto(`/receipts/${receipt.id}`);
		await transferReceiptButton.click();
		const transferModal = modal();
		await expectScreenshotWithSchemes("modal/no-intention.png", {
			locator: transferModal,
		});
		await selectSuggestUser();
		await expectScreenshotWithSchemes("modal/user-selected.png", {
			locator: transferModal,
			mask: [user],
		});
	});

	test("Intention exists", async ({
		page,
		mockReceipt,
		transferReceiptButton,
		expectScreenshotWithSchemes,
		modal,
		user,
	}) => {
		const { receipt } = mockReceipt({
			generateReceipt: (opts) => {
				const firstUser = opts.users[0];
				assert(firstUser);
				return {
					...defaultGenerateReceipt(opts),
					transferIntentionUserId: firstUser.id,
				};
			},
			generateReceiptParticipants: () => [],
		});
		await page.goto(`/receipts/${receipt.id}`);
		await transferReceiptButton.click();
		await expectScreenshotWithSchemes("modal/intention.png", {
			locator: modal(),
			mask: [user],
		});
	});
});
