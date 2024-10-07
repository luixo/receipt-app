import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateReceipt,
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
		const receiptsRemovePause = api.createPause();
		api.mock("receipts.remove", async ({ next }) => {
			await receiptsRemovePause.promise;
			return next();
		});

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
			await awaitCacheKey("receiptTransferIntentions.add", { errored: 1 });
			await verifyToastTexts(
				'Error transferring receipt: Mock "receiptTransferIntentions.add" error',
			);
		},
		{ name: "error" },
	);
	await expect(modal()).toBeHidden();

	const receiptTransferIntentionAddPause = api.createPause();
	api.mock("receiptTransferIntentions.add", async () => {
		await receiptTransferIntentionAddPause.promise;
	});
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

	await snapshotQueries(
		async () => {
			receiptTransferIntentionAddPause.resolve();
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
			await awaitCacheKey("receiptTransferIntentions.remove", { errored: 1 });
			await verifyToastTexts(
				'Error removing receipt transfer intention: Mock "receiptTransferIntentions.remove" error',
			);
		},
		{ name: "error" },
	);
	await expect(modal()).toBeHidden();

	await transferReceiptButton.click();
	const receiptTransferIntentionRemovePause = api.createPause();
	api.mock("receiptTransferIntentions.remove", async () => {
		await receiptTransferIntentionRemovePause.promise;
	});
	await snapshotQueries(
		async () => {
			await cancelTransferButton.click();
			await verifyToastTexts();
		},
		{ name: "loading" },
	);
	await expect(modal()).toBeHidden();

	await snapshotQueries(
		async () => {
			receiptTransferIntentionRemovePause.resolve();
			await awaitCacheKey("receiptTransferIntentions.remove");
			await verifyToastTexts();
		},
		{ name: "success" },
	);
	await expect(modal()).toBeHidden();
});
