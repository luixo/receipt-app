import { TRPCError } from "@trpc/server";
import { isNonNullish } from "remeda";

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
	theirNonExistent,
	theirSynced,
} from "~tests/frontend/generators/receipts";

import { test } from "./debts.utils";

test.describe("Wrapper component", () => {
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
			generateDebts: generateDebtsMapped(),
		});

		const debtsGetPause = api.createPause();
		api.mock("debts.get", async () => {
			await debtsGetPause.wait();
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "debts.get" error`,
			});
		});
		await openReceipt(receipt.id);
		await expect(propagateDebtsButton).not.toBeAttached();
		await expect(updateDebtsButton).not.toBeAttached();
		await expect(debtsInfoModalButton).not.toBeAttached();

		debtsGetPause.resolve();
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
			generateDebts: generateDebtsMapped(ourDesynced, theirSynced),
		});
		await openReceiptWithDebts(receipt);
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
			generateDebts: generateDebtsMapped(ourSynced, theirDesynced),
		});
		await openReceiptWithDebts(receipt);
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
			generateDebts: generateDebtsMapped(ourNonExistent),
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
			generateDebts: generateDebtsMapped([ourDesynced, ourNonExistent]),
		});
		await openReceiptWithDebts(receipt);
		await expect(propagateDebtsButton).not.toBeVisible();
		await expect(updateDebtsButton).toBeVisible();
	});

	test("Every participant is synced", async ({
		mockReceiptWithDebts,
		openReceiptWithDebts,
		propagateDebtsButton,
		updateDebtsButton,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: generateDebtsMapped(ourSynced),
		});
		await openReceiptWithDebts(receipt);
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
			generateDebts: generateDebtsMapped(ourDesynced),
		});
		await openReceiptWithDebts(receipt);
		await expect(debtsInfoModalButton).toBeVisible();
	});

	test("Desynced participants do not exist", async ({
		mockReceiptWithDebts,
		openReceiptWithDebts,
		debtsInfoModalButton,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: generateDebtsMapped(ourSynced, theirNonExistent),
		});
		await openReceiptWithDebts(receipt);
		await expect(debtsInfoModalButton).not.toBeVisible();
	});

	test("Opens a modal", async ({
		mockReceiptWithDebts,
		openReceiptWithDebts,
		openDebtsInfoModal,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: generateDebtsMapped(ourDesynced, theirNonExistent),
		});
		await openReceiptWithDebts(receipt);
		await openDebtsInfoModal();
	});
});

test.describe("Mutations", () => {
	test("'debts.add' and 'debts.update'", async ({
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
				generateDebts: generateDebtsMapped([ourNonExistent, ourDesynced]),
				generateReceiptItemsParts: (opts) =>
					defaultGenerateReceiptItemsParts({
						...opts,
						// Creating a 0 sum participant
						participants: opts.participants.slice(1),
					}),
			});
		api.mock("debts.add", ({ input: addedDebt }) => ({
			id:
				debts.find((debt) => debt.userId === addedDebt.userId)?.id ||
				faker.string.uuid(),
			lockedTimestamp: new Date(),
			reverseAccepted:
				addedDebt.userId
					.split("")
					.reduce((acc, c) => acc + c.charCodeAt(0), 0) %
					2 ===
				0,
		}));
		api.mock("debts.update", ({ input: updatedDebt }) => ({
			lockedTimestamp: new Date(),
			reverseLockedTimestampUpdated:
				updatedDebt.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
					2 ===
				0,
		}));

		await openReceiptWithDebts(receipt);
		const { nextQueryCache } = await snapshotQueries(async () => {
			await updateDebtsButton.click();
			await awaitCacheKey([
				{ path: "debts.add", amount: 3 },
				{ path: "debts.update", amount: 2 },
			]);
		});
		const addMutationsVariables = getMutationsByKey(
			nextQueryCache,
			"debts.add",
		).map((mutation) => mutation.state.variables);
		const updateMutationsVariables = getMutationsByKey(
			nextQueryCache,
			"debts.update",
		).map((mutation) => mutation.state.variables);
		// Added debts & updated debts & self debt should be less than participants
		// Because at least one participant has zero sum
		expect(participants.length).toBeGreaterThan(
			addMutationsVariables.length + updateMutationsVariables.length + 1,
		);
		const participantSums = getParticipantSums(
			receipt.id,
			receiptItemsParts,
			participants,
		);
		const participantTuples = participantSums.map(
			(participant) => [participant.userId, participant.sum] as const,
		);
		const addedDebts = addMutationsVariables.map(
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
				.filter(isNonNullish),
		);
		const updatedDebts = updateMutationsVariables.map(
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
