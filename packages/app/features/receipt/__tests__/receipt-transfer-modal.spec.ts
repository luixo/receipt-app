import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptBase,
	defaultGenerateReceiptParticipants,
} from "~tests/frontend/generators/receipts";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";

import { test } from "./receipt-transfer-modal.utils";

test.describe("Modal is disabled", () => {
	test("on removing receipt", async ({
		api,
		page,
		mockReceipt,
		transferReceiptButton,
	}) => {
		const { receipt } = mockReceipt();
		api.pause("receipts.remove");

		await page.goto(`/receipts/${receipt.id}`);
		await page.getByText("Remove receipt").click();
		await page.getByText("Yes").click();

		await expect(transferReceiptButton).toBeDisabled();
	});

	test("on participants added", async ({
		page,
		mockReceipt,
		transferReceiptButton,
		expectTooltip,
	}) => {
		const { receipt } = mockReceipt({
			generateReceiptItems: () => [],
			generateReceiptParticipants: (opts) =>
				defaultGenerateReceiptParticipants({
					...opts,
					users: opts.users.slice(0, 1),
					addSelf: false,
				}),
		});

		await page.goto(`/receipts/${receipt.id}`);

		await expect(transferReceiptButton).toBeDisabled();
		await expectTooltip(
			page.locator("span", { has: transferReceiptButton }),
			"You can only transfer a receipt with no participants in it",
		);
	});

	test("if receipt is locked", async ({
		page,
		mockReceipt,
		transferReceiptButton,
	}) => {
		const { receipt } = mockReceipt({
			generateReceiptBase: (opts) => ({
				...defaultGenerateReceiptBase(opts),
				lockedTimestamp: new Date(),
			}),
		});

		await page.goto(`/receipts/${receipt.id}`);

		await expect(transferReceiptButton).toBeDisabled();
	});
});

test("Add intention is disabled if no user is selected", async ({
	page,
	mockReceipt,
	transferReceiptButton,
	sendTransferButton,
}) => {
	const { receipt } = mockReceipt({
		generateReceiptParticipants: () => [],
	});

	await page.goto(`/receipts/${receipt.id}`);
	await transferReceiptButton.click();

	await expect(sendTransferButton).toBeDisabled();
});

test("Mutation 'receiptTransferIntentions.add' mutation", async ({
	api,
	page,
	mockReceipt,
	transferReceiptButton,
	sendTransferButton,
	selectSuggestUser,
	snapshotQueries,
	modal,
	awaitCacheKey,
	verifyToastTexts,
}) => {
	const { receipt, users } = mockReceipt({
		generateUsers: (opts) =>
			defaultGenerateUsers(opts).map((user) => ({
				...user,
				connectedAccount: {
					id: opts.faker.string.uuid(),
					email: opts.faker.internet.email(),
				},
			})),
		generateReceiptParticipants: () => [],
	});
	api.mock("users.suggestTop", { items: users.map(({ id }) => id) });
	api.mock("receiptTransferIntentions.add", () => {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Mock "receiptTransferIntentions.add" error`,
		});
	});

	await page.goto(`/receipts/${receipt.id}`);
	await transferReceiptButton.click();
	await selectSuggestUser();
	await snapshotQueries(
		async () => {
			await sendTransferButton.click();
			await awaitCacheKey("receiptTransferIntentions.add");
			await verifyToastTexts(
				'Error transferring receipt: Mock "receiptTransferIntentions.add" error',
			);
		},
		{ name: "error" },
	);
	await expect(modal()).toBeHidden();

	api.pause("receiptTransferIntentions.add");
	await transferReceiptButton.click();
	await selectSuggestUser();
	await snapshotQueries(
		async () => {
			await sendTransferButton.click();
			await verifyToastTexts();
		},
		{ name: "loading" },
	);
	await expect(modal()).toBeHidden();

	api.mock("receiptTransferIntentions.add", () => undefined);
	await snapshotQueries(
		async () => {
			api.unpause("receiptTransferIntentions.add");
			await awaitCacheKey("receiptTransferIntentions.add");
			await verifyToastTexts(
				`Receipt transfer intention was sent to "${users.find(
					(user) => user.connectedAccount,
				)?.connectedAccount?.email}"`,
			);
		},
		{ name: "success" },
	);
	await expect(modal()).toBeHidden();
});

test("Mutation 'receiptTransferIntentions.remove'", async ({
	api,
	page,
	mockReceipt,
	transferReceiptButton,
	cancelTransferButton,
	snapshotQueries,
	modal,
	awaitCacheKey,
	verifyToastTexts,
}) => {
	const { receipt } = mockReceipt({
		generateReceiptParticipants: () => [],
		generateUsers: (opts) => {
			const [firstUser, ...users] = defaultGenerateUsers(opts);
			assert(firstUser);
			return [
				{
					...firstUser,
					connectedAccount: {
						id: opts.faker.string.uuid(),
						email: opts.faker.internet.email(),
					},
				},
				...users.slice(1),
			];
		},
		generateReceipt: (opts) => ({
			...defaultGenerateReceipt(opts),
			transferIntentionUserId: opts.users.find((user) => user.connectedAccount)
				?.id,
		}),
	});
	api.mock("receiptTransferIntentions.remove", () => {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Mock "receiptTransferIntentions.remove" error`,
		});
	});

	await page.goto(`/receipts/${receipt.id}`);
	await transferReceiptButton.click();
	await snapshotQueries(
		async () => {
			await cancelTransferButton.click();
			await awaitCacheKey("receiptTransferIntentions.remove");
			await verifyToastTexts(
				'Error removing receipt transfer intention: Mock "receiptTransferIntentions.remove" error',
			);
		},
		{ name: "error" },
	);
	await expect(modal()).toBeHidden();

	await transferReceiptButton.click();
	api.pause("receiptTransferIntentions.remove");
	await snapshotQueries(
		async () => {
			await cancelTransferButton.click();
			await verifyToastTexts();
		},
		{ name: "loading" },
	);
	await expect(modal()).toBeHidden();

	api.mock("receiptTransferIntentions.remove", () => undefined);
	await snapshotQueries(
		async () => {
			api.unpause("receiptTransferIntentions.remove");
			await awaitCacheKey("receiptTransferIntentions.remove");
			await verifyToastTexts();
		},
		{ name: "success" },
	);
	await expect(modal()).toBeHidden();
});
