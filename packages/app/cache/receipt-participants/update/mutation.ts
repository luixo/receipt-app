import { cache, Revert } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";

type ReceiptParticipant =
	TRPCQueryOutput<"receipt-items.get">["participants"][number];

const applyUpdate = (
	item: ReceiptParticipant,
	update: TRPCMutationInput<"receipt-participants.update">["update"]
): ReceiptParticipant => {
	switch (update.type) {
		case "role":
			return { ...item, role: update.role };
		case "resolved":
			return { ...item, resolved: update.resolved };
	}
};

const getRevert =
	(
		snapshot: ReceiptParticipant,
		update: TRPCMutationInput<"receipt-participants.update">["update"]
	): Revert<ReceiptParticipant> =>
	(item) => {
		switch (update.type) {
			case "role":
				return { ...item, role: snapshot.role };
			case "resolved":
				return { ...item, resolved: snapshot.resolved };
		}
	};

type PagedReceipt = TRPCQueryOutput<"receipts.get-paged">["items"][number];

const applyUpdateUserPaged = (
	item: PagedReceipt,
	update: TRPCMutationInput<"receipt-participants.update">["update"]
): PagedReceipt => {
	switch (update.type) {
		case "resolved":
			return { ...item, participantResolved: update.resolved };
		case "role":
			return { ...item, role: update.role };
	}
};

type Receipt = TRPCQueryOutput<"receipts.get">;

const applyUpdateUser = (
	item: Receipt,
	update: TRPCMutationInput<"receipt-participants.update">["update"]
): Receipt => {
	switch (update.type) {
		case "resolved":
			return { ...item, participantResolved: update.resolved };
		case "role":
			return { ...item, role: update.role };
	}
};

export const mutationOptions: UseContextedMutationOptions<
	"receipt-participants.update",
	Revert<ReceiptParticipant> | undefined,
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
					(receipt) => applyUpdateUserPaged(receipt, variables.update)
				);
				cache.receipts.get.update(trpcContext, variables.receiptId, (receipt) =>
					applyUpdateUser(receipt, variables.update)
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
