import { cache, Revert } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";

type ReceiptParticipants = TRPCQueryOutput<"receipt-items.get">["participants"];

const applyUpdate = (
	item: ReceiptParticipants[number],
	update: TRPCMutationInput<"receipt-participants.update">["update"]
): ReceiptParticipants[number] => {
	switch (update.type) {
		case "role":
			return { ...item, role: update.role };
		case "resolved":
			return { ...item, resolved: update.resolved };
	}
};

const getRevert =
	(
		snapshot: ReceiptParticipants[number],
		update: TRPCMutationInput<"receipt-participants.update">["update"]
	): Revert<ReceiptParticipants[number]> =>
	(item) => {
		switch (update.type) {
			case "role":
				return { ...item, role: snapshot.role };
			case "resolved":
				return { ...item, resolved: snapshot.resolved };
		}
	};

export const mutationOptions: UseContextedMutationOptions<
	"receipt-participants.update",
	Revert<ReceiptParticipants[number]> | undefined,
	{ isSelfAccount: boolean }
> = {
	onMutate: (trpcContext) => (variables) => {
		const snapshot = cache.receiptItems.get.receiptParticipant.update(
			trpcContext,
			variables.receiptId,
			variables.userId,
			(participant) =>
				applyUpdate({ ...participant, dirty: true }, variables.update)
		);
		return snapshot && getRevert(snapshot, variables.update);
	},
	onSuccess:
		(trpcContext, { isSelfAccount }) =>
		(_result, variables) => {
			cache.receiptItems.get.receiptParticipant.update(
				trpcContext,
				variables.receiptId,
				variables.userId,
				(participant) => ({
					...participant,
					dirty: false,
				})
			);
			if (isSelfAccount) {
				cache.receipts.getPaged.update(
					trpcContext,
					variables.receiptId,
					(receipt) => {
						switch (variables.update.type) {
							case "resolved":
								return {
									...receipt,
									participantResolved: variables.update.resolved,
								};
							case "role":
								return { ...receipt, role: variables.update.role };
						}
					}
				);
			}
		},
	onError: (trpcContext) => (_error, variables, revert) => {
		if (!revert) {
			return;
		}
		cache.receiptItems.get.receiptParticipant.update(
			trpcContext,
			variables.receiptId,
			variables.userId,
			revert
		);
	},
};
