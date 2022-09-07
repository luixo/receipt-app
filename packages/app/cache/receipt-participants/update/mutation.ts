import { cache, Revert } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

type ReceiptParticipant =
	TRPCQueryOutput<"receiptItems.get">["participants"][number];

const applyUpdate = (
	item: ReceiptParticipant,
	update: TRPCMutationInput<"receiptParticipants.update">["update"]
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
		update: TRPCMutationInput<"receiptParticipants.update">["update"]
	): Revert<ReceiptParticipant> =>
	(item) => {
		switch (update.type) {
			case "role":
				return { ...item, role: snapshot.role };
			case "resolved":
				return { ...item, resolved: snapshot.resolved };
		}
	};

type PagedReceipt = TRPCQueryOutput<"receipts.getPaged">["items"][number];

const applyUpdateReceiptPaged = (
	item: PagedReceipt,
	update: TRPCMutationInput<"receiptParticipants.update">["update"]
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
	update: TRPCMutationInput<"receiptParticipants.update">["update"]
): Receipt => {
	switch (update.type) {
		case "resolved":
			return { ...item, participantResolved: update.resolved };
		case "role":
			return { ...item, role: update.role };
	}
};

type ReceiptParticipants = TRPCQueryOutput<"receipts.getResolvedParticipants">;

const applyUpdateResolvedParticipants = (
	participants: ReceiptParticipants,
	selfUserId: UsersId,
	update: TRPCMutationInput<"receiptParticipants.update">["update"]
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
	"receiptParticipants.update",
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
			if (variables.update.type === "resolved") {
				const nextResolved = variables.update.resolved;
				cache.receipts.getNonResolvedAmount.update(trpcContext, (prevAmount) =>
					nextResolved ? prevAmount - 1 : prevAmount + 1
				);
				if (variables.update.resolved) {
					cache.receipts.getPaged.remove(
						trpcContext,
						variables.receiptId,
						(input) => input.onlyNonResolved
					);
				} else {
					cache.receipts.getPaged.invalidate(
						trpcContext,
						0,
						(input) => input.onlyNonResolved
					);
				}
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
