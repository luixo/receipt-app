import { cache, Revert } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

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

const applyUpdateReceiptPaged = (
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

const applyUpdateReceipt = (
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

type ReceiptParticipants =
	TRPCQueryOutput<"receipts.get-resolved-participants">;

const applyUpdateResolvedParticipants = (
	participants: ReceiptParticipants,
	selfUserId: UsersId,
	update: TRPCMutationInput<"receipt-participants.update">["update"]
): ReceiptParticipants => {
	switch (update.type) {
		case "resolved":
			return participants.map((participant) =>
				participant.localUserId === selfUserId
					? { ...participant, resolved: update.resolved }
					: participant
			);
		case "role":
			return participants;
	}
};

export const mutationOptions: UseContextedMutationOptions<
	"receipt-participants.update",
	Revert<ReceiptParticipant> | undefined,
	{ userId?: UsersId }
> = {
	onMutate: (trpcContext) => (variables) => {
		const snapshot = cache.receiptItems.get.receiptParticipant.update(
			trpcContext,
			variables.receiptId,
			variables.userId,
			(participant) => applyUpdate(participant, variables.update)
		);
		return snapshot && getRevert(snapshot, variables.update);
	},
	onSuccess:
		(trpcContext, { userId }) =>
		(_result, variables) => {
			if (userId) {
				cache.receipts.getPaged.update(
					trpcContext,
					variables.receiptId,
					(receipt) => applyUpdateReceiptPaged(receipt, variables.update)
				);
				cache.receipts.get.update(trpcContext, variables.receiptId, (receipt) =>
					applyUpdateReceipt(receipt, variables.update)
				);
				cache.receipts.getResolvedParticipants.update(
					trpcContext,
					variables.receiptId,
					(receipt) =>
						applyUpdateResolvedParticipants(receipt, userId, variables.update)
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
