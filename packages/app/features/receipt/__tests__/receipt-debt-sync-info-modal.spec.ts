import { expect } from "@tests/frontend/fixtures";
import { getParticipantSums } from "app/utils/receipt-item";
import type { UsersId } from "next-app/db/models";

import { test } from "./receipt-debt-sync-info-modal.utils";

test.describe("Receipt debt sync info modal", () => {
	test("Sorting", async ({
		mockReceiptWithDebtsForModal,
		openReceiptWithDebts,
		openDebtsInfoModal,
		participantDebtRow,
	}) => {
		const { receipt, debts, participants, receiptItemsParts, selfAccount } =
			mockReceiptWithDebtsForModal();
		await openReceiptWithDebts(receipt.id);
		await openDebtsInfoModal();
		const userNames = await participantDebtRow
			.getByTestId("user")
			.locator("span.text-small:visible")
			.allInnerTexts();
		const participantSums = getParticipantSums(
			receipt.id,
			receiptItemsParts,
			participants,
		);
		type User = {
			id: UsersId;
			name: string;
			sum: number;
		};
		const users = participants.reduce<
			Record<"synced" | "unsynced" | "desynced" | "empty", User[]>
		>(
			(acc, participant) => {
				if (participant.remoteUserId === selfAccount.userId) {
					return acc;
				}
				const expectedSum =
					participantSums.find(
						({ remoteUserId }) => remoteUserId === participant.remoteUserId,
					)?.sum ?? 0;
				const getUser = (): User => ({
					id: participant.remoteUserId,
					name: participant.name,
					sum: expectedSum,
				});
				const matchedDebt = debts.find(
					(debt) => debt.userId === participant.remoteUserId,
				);
				if (matchedDebt) {
					// Desyned debts
					if (matchedDebt.amount !== expectedSum) {
						return { ...acc, desynced: [...acc.desynced, getUser()] };
					}
					// Synced debts
					return { ...acc, synced: [...acc.synced, getUser()] };
				}
				if (expectedSum === 0) {
					return { ...acc, empty: [...acc.empty, getUser()] };
				}
				return { ...acc, unsynced: [...acc.unsynced, getUser()] };
			},
			{
				synced: [],
				unsynced: [],
				desynced: [],
				empty: [],
			},
		);
		expect(users.unsynced.length).toBeGreaterThan(0);
		expect(users.desynced.length).toBeGreaterThan(0);
		expect(users.synced.length).toBeGreaterThan(0);
		expect(users.empty.length).toBeGreaterThan(0);
		const sortInner = (notSortedUsers: User[]): UsersId[] =>
			notSortedUsers
				.sort((a, b) =>
					a.sum === b.sum ? b.id.localeCompare(a.id) : b.sum - a.sum,
				)
				.map((user) => user.name);
		expect(userNames).toEqual([
			...sortInner(users.unsynced),
			...sortInner(users.desynced),
			...sortInner(users.synced),
			...sortInner(users.empty),
		]);
	});
});
