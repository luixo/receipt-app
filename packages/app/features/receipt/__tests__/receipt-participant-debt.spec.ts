import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { getParticipantSums } from "~app/utils/receipt-item";
import { expect } from "~tests/frontend/fixtures";
import { getMutationsByKey } from "~tests/frontend/fixtures/queries";
import {
	defaultGenerateReceiptItemsParts,
	generateDebtsMapped,
	ourDesynced,
	ourNonExistent,
	ourSynced,
	theirDesynced,
	theirSynced,
} from "~tests/frontend/generators/receipts";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";
import { DAY } from "~utils/time";

import { test } from "./receipt-participant-debt.utils";

test("Debt sum is 0", async ({
	openReceiptWithDebts,
	mockReceiptWithDebts,
	participantDebtRow,
	debtSyncStatus,
	updateDebtButton,
	sendDebtButton,
	zeroSumIcon,
	receiptMismatchIcon,
	openDebtsInfoModal,
}) => {
	const { receipt } = mockReceiptWithDebts({
		// We need at least 1 desynced user to open a modal
		generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 2 }),
		generateDebts: generateDebtsMapped(ourDesynced),
		generateReceiptItemsParts: (opts) =>
			// Creating a 0 sum participant
			defaultGenerateReceiptItemsParts({
				...opts,
				participants: opts.participants.slice(1),
			}),
	});
	await openReceiptWithDebts(receipt);
	await openDebtsInfoModal();
	await expect(participantDebtRow).toHaveCount(2);
	const rowMatch = participantDebtRow.filter({ has: zeroSumIcon });
	await expect(rowMatch).toHaveCount(1);
	await expect(rowMatch.locator(receiptMismatchIcon)).not.toBeVisible();
	await expect(rowMatch.locator(debtSyncStatus)).not.toBeVisible();
	await expect(rowMatch.locator(updateDebtButton)).not.toBeVisible();
	await expect(rowMatch.locator(sendDebtButton)).not.toBeVisible();
});

test("Debt is unsynced", async ({
	api,
	openReceiptWithDebts,
	mockReceiptWithDebts,
	participantDebtRow,
	debtSyncStatus,
	updateDebtButton,
	sendDebtButton,
	zeroSumIcon,
	receiptMismatchIcon,
	openDebtsInfoModal,
	snapshotQueries,
	withLoader,
}) => {
	const { receipt } = mockReceiptWithDebts({
		// We need at least 1 desynced user to open a modal
		generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 2 }),
		generateDebts: generateDebtsMapped([ourDesynced, ourNonExistent]),
	});
	await openReceiptWithDebts(receipt);
	await openDebtsInfoModal();
	await expect(participantDebtRow).toHaveCount(2);
	const rowMatch = participantDebtRow.filter({ has: sendDebtButton });
	await expect(rowMatch).toHaveCount(1);
	await expect(rowMatch.locator(zeroSumIcon)).not.toBeVisible();
	await expect(rowMatch.locator(receiptMismatchIcon)).not.toBeVisible();
	await expect(rowMatch.locator(debtSyncStatus)).not.toBeVisible();
	await expect(rowMatch.locator(updateDebtButton)).not.toBeVisible();
	const debtsAddPause = api.createPause();
	api.mock("debts.add", async ({ next }) => {
		await debtsAddPause.promise;
		return next();
	});
	await snapshotQueries(
		async () => {
			const sendButtonMatch = rowMatch.locator(sendDebtButton);
			const buttonWithLoader = withLoader(sendButtonMatch);
			await expect(buttonWithLoader).not.toBeVisible();
			await sendButtonMatch.click();
			await expect(sendButtonMatch).toBeDisabled();
			await expect(buttonWithLoader).toBeVisible();
		},
		{ skipCache: true },
	);
});

test("Debt is synced", async ({
	openReceiptWithDebts,
	mockReceiptWithDebts,
	participantDebtRow,
	debtSyncStatus,
	updateDebtButton,
	sendDebtButton,
	zeroSumIcon,
	receiptMismatchIcon,
	openDebtsInfoModal,
}) => {
	const { receipt } = mockReceiptWithDebts({
		// We need at least 1 desynced user to open a modal
		generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 2 }),
		generateDebts: generateDebtsMapped([ourDesynced, ourSynced]),
	});
	await openReceiptWithDebts(receipt);
	await openDebtsInfoModal();
	await expect(participantDebtRow).toHaveCount(2);
	const rowMatch = participantDebtRow.filter({ hasNot: updateDebtButton });
	await expect(rowMatch).toHaveCount(1);
	await expect(rowMatch.locator(zeroSumIcon)).not.toBeVisible();
	await expect(rowMatch.locator(receiptMismatchIcon)).not.toBeVisible();
	await expect(rowMatch.locator(debtSyncStatus)).toBeVisible();
	await expect(rowMatch.locator(updateDebtButton)).not.toBeVisible();
	await expect(rowMatch.locator(sendDebtButton)).not.toBeVisible();
});

test.describe("Debt is desynced", () => {
	test("Update action", async ({
		api,
		openReceiptWithDebts,
		mockReceiptWithDebts,
		participantDebtRow,
		debtSyncStatus,
		updateDebtButton,
		sendDebtButton,
		zeroSumIcon,
		receiptMismatchIcon,
		openDebtsInfoModal,
		snapshotQueries,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			// We validate 2 desynced debt: one with their desynced debt, and with their synced debt
			generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 2 }),
			generateDebts: generateDebtsMapped(ourDesynced, [
				theirDesynced,
				theirSynced,
			]),
		});
		await openReceiptWithDebts(receipt);
		await openDebtsInfoModal();
		await expect(participantDebtRow).toHaveCount(2);
		await expect(zeroSumIcon).not.toBeVisible();
		await expect(receiptMismatchIcon).toHaveCount(2);
		await expect(debtSyncStatus).toHaveCount(2);
		await expect(updateDebtButton).toHaveCount(2);
		await expect(sendDebtButton).not.toBeVisible();
		const debtsUpdatePause = api.createPause();
		api.mock("debts.update", async ({ next }) => {
			await debtsUpdatePause.promise;
			return next();
		});
		await snapshotQueries(
			async () => {
				await updateDebtButton.first().click();
				await expect(updateDebtButton).toHaveCount(1);
			},
			{ skipCache: true },
		);
	});

	test("Amount desync", async ({
		openReceiptWithDebts,
		mockReceiptWithDebts,
		openDebtsInfoModal,
		participantDebtRow,
		debtSyncStatus,
		updateDebtButton,
		sendDebtButton,
		zeroSumIcon,
		receiptMismatchIcon,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 1 }),
			generateDebts: generateDebtsMapped((debt) => ({
				...debt,
				amount: debt.amount + 1,
			})),
		});
		await openReceiptWithDebts(receipt);
		await openDebtsInfoModal();
		await expect(participantDebtRow).toHaveCount(1);
		await expect(zeroSumIcon).not.toBeVisible();
		await expect(receiptMismatchIcon).toBeVisible();
		await expect(debtSyncStatus).toBeVisible();
		await expect(updateDebtButton).toBeVisible();
		await expect(sendDebtButton).not.toBeVisible();
	});

	test("Receipt id desync", async ({
		openReceiptWithDebts,
		mockReceiptWithDebts,
		openDebtsInfoModal,
		participantDebtRow,
		debtSyncStatus,
		updateDebtButton,
		sendDebtButton,
		zeroSumIcon,
		receiptMismatchIcon,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 1 }),
			generateDebts: generateDebtsMapped((debt) => {
				const { receiptId } = debt;
				assert(receiptId);
				return {
					...debt,
					receiptId: `a${receiptId.slice(1)}`,
				};
			}),
		});
		await openReceiptWithDebts(receipt);
		await openDebtsInfoModal();
		await expect(participantDebtRow).toHaveCount(1);
		await expect(zeroSumIcon).not.toBeVisible();
		await expect(receiptMismatchIcon).toBeVisible();
		await expect(debtSyncStatus).toBeVisible();
		await expect(updateDebtButton).toBeVisible();
		await expect(sendDebtButton).not.toBeVisible();
	});

	test("Currency desync", async ({
		openReceiptWithDebts,
		mockReceiptWithDebts,
		openDebtsInfoModal,
		participantDebtRow,
		debtSyncStatus,
		updateDebtButton,
		sendDebtButton,
		zeroSumIcon,
		receiptMismatchIcon,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 1 }),
			generateDebts: generateDebtsMapped((debt) => ({
				...debt,
				currencyCode: "USD",
			})),
		});
		await openReceiptWithDebts(receipt);
		await openDebtsInfoModal();
		await expect(participantDebtRow).toHaveCount(1);
		await expect(zeroSumIcon).not.toBeVisible();
		await expect(receiptMismatchIcon).toBeVisible();
		await expect(debtSyncStatus).toBeVisible();
		await expect(updateDebtButton).toBeVisible();
		await expect(sendDebtButton).not.toBeVisible();
	});

	test("Issued date desync", async ({
		openReceiptWithDebts,
		mockReceiptWithDebts,
		openDebtsInfoModal,
		participantDebtRow,
		debtSyncStatus,
		updateDebtButton,
		sendDebtButton,
		zeroSumIcon,
		receiptMismatchIcon,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 1 }),
			generateDebts: generateDebtsMapped((debt) => {
				assert(debt.timestamp);
				return {
					...debt,
					timestamp: new Date(debt.timestamp.valueOf() - DAY),
				};
			}),
		});
		await openReceiptWithDebts(receipt);
		await openDebtsInfoModal();
		await expect(participantDebtRow).toHaveCount(1);
		await expect(zeroSumIcon).not.toBeVisible();
		await expect(receiptMismatchIcon).toBeVisible();
		await expect(debtSyncStatus).toBeVisible();
		await expect(updateDebtButton).toBeVisible();
		await expect(sendDebtButton).not.toBeVisible();
	});
});

test.describe("Mutations", () => {
	test("Mutation 'debts.add'", async ({
		api,
		page,
		faker,
		sendDebtButton,
		mockReceiptWithDebts,
		openDebtsInfoModal,
		snapshotQueries,
		verifyToastTexts,
		openReceiptWithDebts,
		awaitCacheKey,
	}) => {
		const { receipt, participants, receiptItemsParts } = mockReceiptWithDebts({
			generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 4 }),
			generateReceiptItemsParts: (opts) =>
				// Creating a 0 sum participant
				defaultGenerateReceiptItemsParts({
					...opts,
					participants: opts.participants.slice(1),
				}),
			generateDebts: generateDebtsMapped([
				ourNonExistent,
				ourNonExistent,
				ourDesynced,
			]),
		});

		await openReceiptWithDebts(receipt);
		await openDebtsInfoModal();

		api.mock("debts.add", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Forbidden to add a debt",
			});
		});
		await snapshotQueries(
			async () => {
				await sendDebtButton.first().click();
				await verifyToastTexts("Error adding debt: Forbidden to add a debt");
				await awaitCacheKey("debts.add", { errored: 1 });
			},
			{ name: "1-error" },
		);

		const debtsAddPause = api.createPause();
		api.mock("debts.add", async ({ calls }) => {
			await debtsAddPause.promise;
			return {
				id: faker.string.uuid(),
				updatedAt: new Date(),
				reverseAccepted: calls > 1,
			};
		});
		await snapshotQueries(
			async () => {
				await sendDebtButton.first().click();
				await verifyToastTexts("Adding debt..");
			},
			{ name: "1-loading" },
		);

		await snapshotQueries(
			async () => {
				debtsAddPause.resolve();
				await awaitCacheKey("debts.add");
				await verifyToastTexts("Debt added");
			},
			{ name: "1-success" },
		);
		await expect(page).toHaveURL(`/receipts/${receipt.id}`);
		const { nextQueryCache } = await snapshotQueries(
			async () => {
				await sendDebtButton.click();
				await awaitCacheKey("debts.add");
			},
			{ name: "2-success" },
		);
		const addVariablesList = getMutationsByKey(nextQueryCache, "debts.add").map(
			(mutation) => mutation.state.variables,
		);
		const participantSums = getParticipantSums(
			receipt.id,
			receiptItemsParts,
			participants,
		);
		// Validate sum of added debt matches expected
		expect(
			addVariablesList.map((addVariables) => addVariables.amount),
		).toStrictEqual(
			addVariablesList.map(
				(addVariables) =>
					participantSums.find(({ userId }) => addVariables.userId === userId)
						?.sum,
			),
		);
	});

	test("Mutation 'debts.update'", async ({
		api,
		page,
		updateDebtButton,
		mockReceiptWithDebts,
		openDebtsInfoModal,
		snapshotQueries,
		verifyToastTexts,
		openReceiptWithDebts,
		awaitCacheKey,
	}) => {
		const { receipt, receiptItemsParts, participants, debts } =
			mockReceiptWithDebts({
				generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 3 }),
				generateReceiptItemsParts: (opts) =>
					// Creating a 0 sum participant
					defaultGenerateReceiptItemsParts({
						...opts,
						participants: opts.participants.slice(1),
					}),
				generateDebts: generateDebtsMapped(ourDesynced),
			});

		await openReceiptWithDebts(receipt);
		await openDebtsInfoModal();

		api.mock("debts.update", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Forbidden to update a debt",
			});
		});
		await snapshotQueries(
			async () => {
				await updateDebtButton.first().click();
				await verifyToastTexts(
					"Error updating debt: Forbidden to update a debt",
				);
				await awaitCacheKey("debts.update", { errored: 1 });
			},
			{ name: "1-error" },
		);

		const debtsUpdatePause = api.createPause();
		api.mock("debts.update", async ({ calls }) => {
			await debtsUpdatePause.promise;
			return {
				updatedAt: new Date(),
				reverseUpdated: calls > 1,
			};
		});
		await snapshotQueries(
			async () => {
				await updateDebtButton.first().click();
				await verifyToastTexts("Updating debt..");
			},
			{ name: "1-loading" },
		);

		await snapshotQueries(
			async () => {
				debtsUpdatePause.resolve();
				await verifyToastTexts("Debt updated successfully");
				await awaitCacheKey("debts.update");
			},
			{ name: "1-success" },
		);
		await expect(page).toHaveURL(`/receipts/${receipt.id}`);

		const { nextQueryCache } = await snapshotQueries(
			async () => {
				await updateDebtButton.click();
				await awaitCacheKey("debts.update");
			},
			{ name: "2-success" },
		);
		const updateVariablesList = getMutationsByKey(
			nextQueryCache,
			"debts.update",
		).map((mutation) => mutation.state.variables);
		const participantSums = getParticipantSums(
			receipt.id,
			receiptItemsParts,
			participants,
		);
		// Validate sum of updated debt matches expected
		expect(
			updateVariablesList.map(
				(updateVariables) => updateVariables.update.amount,
			),
		).toStrictEqual(
			updateVariablesList.map((updateVariables) => {
				const matchedDebt = debts.find(({ id }) => id === updateVariables.id);
				return participantSums.find(
					({ userId }) => userId === matchedDebt?.userId,
				)?.sum;
			}),
		);
	});
});
