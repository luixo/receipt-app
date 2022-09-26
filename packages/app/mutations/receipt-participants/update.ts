import { cache } from "app/cache";
import { SnapshotFn, UpdateFn } from "app/cache/utils";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { noop } from "app/utils/utils";
import { UsersId } from "next-app/db/models";

type ReceiptParticipant =
	TRPCQueryOutput<"receiptItems.get">["participants"][number];

const applyUpdate =
	(
		update: TRPCMutationInput<"receiptParticipants.update">["update"]
	): UpdateFn<ReceiptParticipant> =>
	(item) => {
		switch (update.type) {
			case "role":
				return { ...item, role: update.role };
			case "resolved":
				return { ...item, resolved: update.resolved };
		}
	};

const getRevert =
	(
		update: TRPCMutationInput<"receiptParticipants.update">["update"]
	): SnapshotFn<ReceiptParticipant> =>
	(snapshot) =>
	(item) => {
		switch (update.type) {
			case "role":
				return { ...item, role: snapshot.role };
			case "resolved":
				return { ...item, resolved: snapshot.resolved };
		}
	};

type PagedReceipt = TRPCQueryOutput<"receipts.getPaged">["items"][number];

const applyUpdateReceiptPaged =
	(
		update: TRPCMutationInput<"receiptParticipants.update">["update"]
	): UpdateFn<PagedReceipt> =>
	(item) => {
		switch (update.type) {
			case "resolved":
				return { ...item, participantResolved: update.resolved };
			case "role":
				return { ...item, role: update.role };
		}
	};

type Receipt = TRPCQueryOutput<"receipts.get">;

const applyUpdateReceipt =
	(
		update: TRPCMutationInput<"receiptParticipants.update">["update"]
	): UpdateFn<Receipt> =>
	(item) => {
		switch (update.type) {
			case "resolved":
				return { ...item, participantResolved: update.resolved };
			case "role":
				return { ...item, role: update.role };
		}
	};

type ResolvedParticipant =
	TRPCQueryOutput<"receipts.getResolvedParticipants">[number];

const applyUpdateResolvedParticipants =
	(
		update: TRPCMutationInput<"receiptParticipants.update">["update"]
	): UpdateFn<ResolvedParticipant> =>
	(participant) => {
		switch (update.type) {
			case "resolved":
				return { ...participant, resolved: update.resolved };
			case "role":
				return participant;
		}
	};

export const options: UseContextedMutationOptions<
	"receiptParticipants.update",
	{ selfUserId: UsersId }
> = {
	onMutate: (trpcContext) => (variables) => ({
		revertFns: cache.receiptItems.updateRevert(trpcContext, {
			getReceiptItem: noop,
			getReceiptParticipant: (controller) =>
				controller.update(
					variables.receiptId,
					variables.userId,
					applyUpdate(variables.update),
					getRevert(variables.update)
				),
			getReceiptItemPart: noop,
		}),
	}),
	onSuccess:
		(trpcContext, { selfUserId }) =>
		(_result, variables) => {
			if (selfUserId === variables.userId) {
				cache.receipts.update(trpcContext, {
					get: (controller) =>
						controller.update(
							variables.receiptId,
							applyUpdateReceipt(variables.update)
						),
					getNonResolvedAmount: (controller) => {
						if (variables.update.type !== "resolved") {
							return;
						}
						const nextResolved = variables.update.resolved;
						controller.update((prevAmount) =>
							nextResolved ? prevAmount - 1 : prevAmount + 1
						);
					},
					getPaged: (controller) => {
						controller.update(
							variables.receiptId,
							applyUpdateReceiptPaged(variables.update)
						);
						if (variables.update.type === "resolved") {
							if (variables.update.resolved) {
								controller.remove(
									variables.receiptId,
									(input) => input.onlyNonResolved
								);
							} else {
								controller.invalidate(0, (input) => input.onlyNonResolved);
							}
						}
					},
					getName: noop,
					getResolvedParticipants: (controller) =>
						controller.update(
							variables.receiptId,
							variables.userId,
							applyUpdateResolvedParticipants(variables.update)
						),
				});
			}
		},
	errorToastOptions: () => (error) => ({
		text: `Error updating a participant: ${error.message}`,
	}),
};
