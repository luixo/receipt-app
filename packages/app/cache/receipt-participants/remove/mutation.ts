import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { AccountsId, ReceiptsId } from "next-app/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"receiptParticipants.remove",
	{
		participant?: ReturnType<
			typeof cache["receiptItems"]["get"]["receiptParticipant"]["remove"]
		>;
		prevResolved?: boolean;
	},
	{ receiptId: ReceiptsId; selfAccountId: AccountsId }
> = {
	onMutate:
		(trpcContext, { receiptId, selfAccountId }) =>
		({ userId }) => {
			const snapshot = cache.receiptItems.get.receiptParticipant.remove(
				trpcContext,
				receiptId,
				userId
			);
			let prevResolved: boolean | undefined;
			if (userId === selfAccountId) {
				const updatedReceiptSnapshot = cache.receipts.getPaged.update(
					trpcContext,
					receiptId,
					(item) => ({
						...item,
						participantResolved: null,
					})
				);
				// null should never happen as participant may only be removed
				// if previous participant resolved status was not null
				if (
					updatedReceiptSnapshot &&
					updatedReceiptSnapshot.participantResolved !== null
				) {
					prevResolved = updatedReceiptSnapshot.participantResolved;
				}
				cache.receipts.get.update(trpcContext, receiptId, (item) => ({
					...item,
					participantResolved: null,
				}));
			}
			return {
				participant: snapshot,
				prevResolved,
			};
		},
	onSuccess:
		(trpcContext, { receiptId }) =>
		(_result, { userId }) => {
			cache.debts.getReceipt.remove(trpcContext, receiptId, userId);
			cache.users.suggest.invalidate(trpcContext);
		},
	onError:
		(trpcContext, { receiptId, selfAccountId }) =>
		(_error, { userId }, { prevResolved, participant } = {}) => {
			if (participant) {
				cache.receiptItems.get.receiptParticipant.add(
					trpcContext,
					receiptId,
					participant.receiptParticipant,
					participant.index
				);
			}
			if (userId === selfAccountId && prevResolved !== undefined) {
				cache.receipts.getPaged.update(trpcContext, receiptId, (item) => ({
					...item,
					participantResolved: prevResolved,
				}));
				cache.receipts.get.update(trpcContext, receiptId, (item) => ({
					...item,
					participantResolved: prevResolved,
				}));
			}
		},
};
