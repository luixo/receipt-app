import { getParticipantSums } from "~app/utils/receipt-item";
import type { UsersId } from "~db";
import { expect } from "~tests/frontend/fixtures";

import { test } from "./receipt-debt-sync-info-modal.utils";

test("Sorting", async ({
	mockReceiptWithDebtsForModal,
	openReceiptWithDebts,
	openDebtsInfoModal,
	participantDebtRow,
	user: userSelector,
}) => {
	const {
		receipt,
		debts,
		participants,
		users,
		receiptItemsParts,
		selfAccount,
	} = mockReceiptWithDebtsForModal();
	await openReceiptWithDebts(receipt);
	await openDebtsInfoModal();
	const userNames = await participantDebtRow
		.locator(userSelector)
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
	const usersBlocks = participants.reduce<
		Record<"synced" | "unsynced" | "desynced" | "empty", User[]>
	>(
		(acc, participant) => {
			if (participant.userId === selfAccount.userId) {
				return acc;
			}
			const expectedSum =
				participantSums.find(({ userId }) => userId === participant.userId)
					?.sum ?? 0;
			const matchedUser = users.find((user) => user.id === participant.userId);
			const getUser = (): User => ({
				id: participant.userId,
				name: matchedUser!.name,
				sum: expectedSum,
			});
			const matchedDebt = debts.find(
				(debt) => debt.userId === participant.userId,
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
	expect(usersBlocks.unsynced.length).toBeGreaterThan(0);
	expect(usersBlocks.desynced.length).toBeGreaterThan(0);
	expect(usersBlocks.synced.length).toBeGreaterThan(0);
	expect(usersBlocks.empty.length).toBeGreaterThan(0);
	const sortInner = (notSortedUsers: User[]): UsersId[] =>
		notSortedUsers
			.sort((a, b) =>
				a.sum === b.sum ? b.id.localeCompare(a.id) : b.sum - a.sum,
			)
			.map((user) => user.name);
	expect(userNames).toEqual([
		...sortInner(usersBlocks.unsynced),
		...sortInner(usersBlocks.desynced),
		...sortInner(usersBlocks.synced),
		...sortInner(usersBlocks.empty),
	]);
});
