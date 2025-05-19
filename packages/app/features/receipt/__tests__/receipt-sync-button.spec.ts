import { TRPCError } from "@trpc/server";
import { isNonNullish } from "remeda";

import { getParticipantSums } from "~app/utils/receipt-item";
import { expect } from "~tests/frontend/fixtures";
import { getMutationsByKey } from "~tests/frontend/fixtures/queries";
import {
	defaultGenerateDebtsFromReceipt,
	ourDesynced,
	ourNonExistent,
	ourSynced,
	remapDebts,
	theirDesynced,
	theirSynced,
} from "~tests/frontend/generators/debts";
import { defaultGenerateReceiptItemsWithConsumers } from "~tests/frontend/generators/receipts";

import { test } from "./debts.utils";

test.describe("Wrapper component", () => {
	test("'debts.get' pending / error", async ({
		api,
		mockReceiptWithDebts,
		propagateDebtsButton,
		updateDebtsButton,
		errorMessage,
		openReceipt,
	}) => {
		const { receipt } = mockReceiptWithDebts();

		const debtsGetPause = api.createPause();
		api.mockFirst("debts.get", async () => {
			await debtsGetPause.promise;
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Mock "debts.get" error`,
			});
		});
		await openReceipt(receipt.id);
		await expect(propagateDebtsButton).not.toBeAttached();
		await expect(updateDebtsButton).not.toBeAttached();

		debtsGetPause.resolve();
		await expect(errorMessage(`Mock "debts.get" error`)).toBeVisible();
		await expect(propagateDebtsButton).not.toBeAttached();
		await expect(updateDebtsButton).not.toBeAttached();
	});
});

test.describe("Propagate debts button", () => {
	test("Our debts desynced w/ receipt, their debts synced w/ ours", async ({
		mockReceiptWithDebts,
		openReceiptWithDebts,
		propagateDebtsButton,
		updateDebtsButton,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: (opts) =>
				remapDebts(
					ourDesynced,
					theirSynced,
				)(defaultGenerateDebtsFromReceipt(opts)),
		});
		await openReceiptWithDebts(receipt);
		await expect(propagateDebtsButton).toBeHidden();
		await expect(updateDebtsButton).toBeVisible();
	});

	test("Our debts synced w/ receipt, their debts desynced w/ ours", async ({
		mockReceiptWithDebts,
		openReceiptWithDebts,
		propagateDebtsButton,
		updateDebtsButton,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: (opts) =>
				remapDebts(
					ourSynced,
					theirDesynced,
				)(defaultGenerateDebtsFromReceipt(opts)),
		});
		await openReceiptWithDebts(receipt);
		await expect(propagateDebtsButton).toBeHidden();
		await expect(updateDebtsButton).toBeHidden();
	});

	test("Our debts don't exist", async ({
		mockReceiptWithDebts,
		openReceipt,
		propagateDebtsButton,
		updateDebtsButton,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: (opts) =>
				remapDebts(ourNonExistent)(defaultGenerateDebtsFromReceipt(opts)),
		});
		await openReceipt(receipt.id);
		await expect(propagateDebtsButton).toBeVisible();
		await expect(updateDebtsButton).toBeHidden();
	});

	test("Some debts desynced w/ receipt, some debts don't exist", async ({
		mockReceiptWithDebts,
		openReceiptWithDebts,
		propagateDebtsButton,
		updateDebtsButton,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: (opts) =>
				remapDebts([ourDesynced, ourNonExistent])(
					defaultGenerateDebtsFromReceipt(opts),
				),
		});
		await openReceiptWithDebts(receipt);
		await expect(propagateDebtsButton).toBeHidden();
		await expect(updateDebtsButton).toBeVisible();
	});

	test("Our debts are synced w/ receipts, their debts are synced w/ ours", async ({
		mockReceiptWithDebts,
		openReceiptWithDebts,
		propagateDebtsButton,
		updateDebtsButton,
	}) => {
		const { receipt } = mockReceiptWithDebts({
			generateDebts: (opts) =>
				remapDebts(ourSynced)(defaultGenerateDebtsFromReceipt(opts)),
		});
		await openReceiptWithDebts(receipt);
		await expect(propagateDebtsButton).toBeHidden();
		await expect(updateDebtsButton).toBeHidden();
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
		fromSubunitToUnit,
		fromUnitToSubunit,
	}) => {
		let originalDebtsAmount = 0;
		const {
			receipt,
			debts,
			participants,
			receiptItemsWithConsumers,
			receiptPayers,
		} = mockReceiptWithDebts({
			generateDebts: (opts) => {
				const originalDebts = defaultGenerateDebtsFromReceipt(opts);
				originalDebtsAmount = originalDebts.length;
				return remapDebts([ourNonExistent, ourDesynced])(originalDebts);
			},
			generateReceiptItemsWithConsumers: (opts) =>
				defaultGenerateReceiptItemsWithConsumers({
					...opts,
					// Creating a 0 sum participant
					participants: opts.participants.slice(1),
				}),
		});
		api.mockFirst("debts.add", ({ input: addedDebt }) => ({
			id:
				debts.find((debt) => debt.userId === addedDebt.userId)?.id ||
				faker.string.uuid(),
			updatedAt: new Date(),
			reverseAccepted:
				addedDebt.userId
					.split("")
					.reduce((acc, c) => acc + c.charCodeAt(0), 0) %
					2 ===
				0,
		}));
		api.mockFirst("debts.update", ({ input: updatedDebt }) => ({
			updatedAt: new Date(),
			reverseUpdated:
				updatedDebt.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
					2 ===
				0,
		}));

		await openReceiptWithDebts(receipt);
		const { nextQueryCache } = await snapshotQueries(async () => {
			await updateDebtsButton.click();
			await awaitCacheKey("debts.add", Math.ceil(originalDebtsAmount / 2));
			await awaitCacheKey("debts.update", Math.floor(originalDebtsAmount / 2));
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
			receiptItemsWithConsumers,
			participants,
			receiptPayers,
			fromUnitToSubunit,
		);
		const participantTuples = participantSums.map((participant) => {
			const sum = fromSubunitToUnit(
				participant.debtSumDecimals - participant.paySumDecimals,
			);
			return [participant.userId, sum] as const;
		});
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
