import { TRPCError } from "@trpc/server";

import { expect } from "@tests/frontend/fixtures";
import { getMutationsByKey } from "@tests/frontend/fixtures/queries";
import { getParticipantSums } from "app/utils/receipt-item";
import { nonNullishGuard } from "app/utils/utils";

import {
	generateDebtsWith,
	ourDesynced,
	ourNonExistent,
	ourSynced,
	theirDesynced,
	theirNonExistent,
	theirSynced,
} from "./debts.generators";
import { test } from "./debts.utils";
import { defaultGenerateReceiptItemsParts } from "./generators";

test.describe("Wrapper component", () => {
	test("'receiptItems.get' pending / error", async ({
		api,
		page,
		mockReceiptWithDebts,
		propagateDebtsButton,
		updateDebtsButton,
		debtsInfoModalButton,
		errorMessage,
		openReceipt,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: generateDebtsWith(),
		});

		api.pause("receiptItems.get");
		await openReceipt(receipt.id);
		await expect(propagateDebtsButton).not.toBeAttached();
		await expect(updateDebtsButton).not.toBeAttached();
		await expect(debtsInfoModalButton).not.toBeAttached();

		api.mock("receiptItems.get", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "receiptItems.get" error`,
			});
		});
		api.unpause("receiptItems.get");
		await expect(
			page.getByTestId("header-aside").filter({
				has: errorMessage(`Mock "receiptItems.get" error`),
			}),
		).toBeVisible();
		await expect(propagateDebtsButton).not.toBeAttached();
		await expect(updateDebtsButton).not.toBeAttached();
		await expect(debtsInfoModalButton).not.toBeAttached();
	});

	test("'debts.get' pending / error", async ({
		api,
		mockReceiptWithDebts,
		propagateDebtsButton,
		updateDebtsButton,
		debtsInfoModalButton,
		errorMessage,
		openReceipt,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: generateDebtsWith(),
		});

		api.pause("debts.get");
		await openReceipt(receipt.id);
		await expect(propagateDebtsButton).not.toBeAttached();
		await expect(updateDebtsButton).not.toBeAttached();
		await expect(debtsInfoModalButton).not.toBeAttached();

		api.mock("debts.get", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "debts.get" error`,
			});
		});
		api.unpause("debts.get");
		await expect(errorMessage(`Mock "debts.get" error`)).toBeVisible();
		await expect(propagateDebtsButton).not.toBeAttached();
		await expect(updateDebtsButton).not.toBeAttached();
		await expect(debtsInfoModalButton).not.toBeAttached();
	});
});

test.describe("Propagate debts button", () => {
	test("Only desynced debts", async ({
		mockReceiptWithDebts,
		openReceiptWithDebts,
		propagateDebtsButton,
		updateDebtsButton,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: generateDebtsWith(ourDesynced, theirSynced),
		});
		await openReceiptWithDebts(receipt.id);
		await expect(propagateDebtsButton).not.toBeVisible();
		await expect(updateDebtsButton).toBeVisible();
	});

	test("Only dismatched their debts", async ({
		mockReceiptWithDebts,
		openReceiptWithDebts,
		propagateDebtsButton,
		updateDebtsButton,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: generateDebtsWith(ourSynced, theirDesynced),
		});
		await openReceiptWithDebts(receipt.id);
		await expect(propagateDebtsButton).not.toBeVisible();
		await expect(updateDebtsButton).not.toBeVisible();
	});

	test("Only non-existent debts", async ({
		mockReceiptWithDebts,
		openReceipt,
		propagateDebtsButton,
		updateDebtsButton,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: generateDebtsWith(ourNonExistent),
		});
		await openReceipt(receipt.id);
		await expect(propagateDebtsButton).toBeVisible();
		await expect(updateDebtsButton).not.toBeVisible();
	});

	test("Both non-existent and desynced debts", async ({
		mockReceiptWithDebts,
		openReceiptWithDebts,
		propagateDebtsButton,
		updateDebtsButton,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: generateDebtsWith([ourDesynced, ourNonExistent]),
		});
		await openReceiptWithDebts(receipt.id);
		await expect(propagateDebtsButton).not.toBeVisible();
		await expect(updateDebtsButton).toBeVisible();
	});

	test("Every participant is synced", async ({
		mockReceiptWithDebts,
		openReceiptWithDebts,
		propagateDebtsButton,
		updateDebtsButton,
		awaitCacheKey,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: generateDebtsWith(ourSynced),
		});
		await openReceiptWithDebts(receipt.id);
		await awaitCacheKey("receiptItems.get");
		await expect(propagateDebtsButton).not.toBeVisible();
		await expect(updateDebtsButton).not.toBeVisible();
	});
});

test.describe("Open debts info modal button", () => {
	test("All participants are desynced", async ({
		mockReceiptWithDebts,
		openReceiptWithDebts,
		debtsInfoModalButton,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: generateDebtsWith(ourDesynced),
		});
		await openReceiptWithDebts(receipt.id);
		await expect(debtsInfoModalButton).toBeVisible();
	});

	test("Desynced participants do not exist", async ({
		mockReceiptWithDebts,
		openReceiptWithDebts,
		debtsInfoModalButton,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: generateDebtsWith(ourSynced, theirNonExistent),
		});
		await openReceiptWithDebts(receipt.id);
		await expect(debtsInfoModalButton).not.toBeVisible();
	});

	test("Opens a modal", async ({
		mockReceiptWithDebts,
		openReceiptWithDebts,
		openDebtsInfoModal,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: generateDebtsWith(ourDesynced, theirNonExistent),
		});
		await openReceiptWithDebts(receipt.id);
		await openDebtsInfoModal();
	});
});

test.describe("Mutations", () => {
	test("'debts.addBatch' and 'debts.updateBatch'", async ({
		api,
		faker,
		updateDebtsButton,
		mockReceiptWithDebts,
		awaitCacheKey,
		openReceiptWithDebts,
		snapshotQueries,
	}) => {
		const { receipt, debts, participants, receiptItemsParts } =
			mockReceiptWithDebts({
				generateDebts: generateDebtsWith([ourNonExistent, ourDesynced]),
				generateReceiptItemsParts: (opts) =>
					defaultGenerateReceiptItemsParts({
						...opts,
						// Creating a 0 sum participant
						participants: opts.participants.slice(1),
					}),
			});
		api.mock("debts.addBatch", (addedDebts) => ({
			ids: addedDebts.map(
				(addedDebt) =>
					debts.find((debt) => debt.userId === addedDebt.userId)?.id ||
					faker.string.uuid(),
			),
			lockedTimestamp: new Date(),
			reverseAcceptedUserIds: [
				...new Set(
					addedDebts
						.map((debt, index) => (index % 2 === 0 ? debt.userId : undefined))
						.filter(nonNullishGuard),
				),
			],
		}));
		api.mock("debts.updateBatch", (updatedDebts) =>
			updatedDebts.map((debt, index) => ({
				debtId: debt.id,
				lockedTimestamp: new Date(),
				reverseLockedTimestampUpdated: index % 2 === 0,
			})),
		);

		await openReceiptWithDebts(receipt.id);
		const { nextQueryCache } = await snapshotQueries(async () => {
			await updateDebtsButton.click();
			await awaitCacheKey(["debts.addBatch", "debts.updateBatch"]);
		});
		const addBatchVariables = getMutationsByKey(
			nextQueryCache,
			"debts.addBatch",
		)[0]!.state.variables;
		const updateBatchVariables = getMutationsByKey(
			nextQueryCache,
			"debts.updateBatch",
		)[0]!.state.variables;
		// Added debts & updated debts & self debt should be less than participants
		// Because at least one participant has zero sum
		expect(participants.length).toBeGreaterThan(
			addBatchVariables.length + updateBatchVariables.length + 1,
		);
		const participantSums = getParticipantSums(
			receipt.id,
			receiptItemsParts,
			participants,
		);
		const participantTuples = participantSums.map(
			(participant) => [participant.userId, participant.sum] as const,
		);
		const addedDebts = addBatchVariables.map(
			(debt) => [debt.userId, debt.amount] as const,
		);
		// Validate sums of added debts match expected
		expect(addedDebts.map(([, amount]) => amount)).toStrictEqual(
			addedDebts
				.map(
					([userId]) =>
						participantTuples.find(
							([participantId]) => userId === participantId,
						)?.[1],
				)
				.filter(nonNullishGuard),
		);
		const updatedDebts = updateBatchVariables.map(
			(debt) => [debt.id, debt.update.amount] as const,
		);
		// Validate sums of updated debts match expected
		expect(updatedDebts.map(([, amount]) => amount)).toStrictEqual(
			updatedDebts.map(([debtId]) => {
				const matchedDebt = debts.find((debt) => debt.id === debtId);
				return participantTuples.find(
					([participantId]) => participantId === matchedDebt?.userId,
				)?.[1];
			}),
		);
	});
});
