import { cache } from "app/cache";
import type { SnapshotFn, UpdateFn } from "app/cache/utils";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import type { UsersId } from "next-app/db/models";

type ReceiptParticipant =
	TRPCQueryOutput<"receipts.get">["participants"][number];

const applyUpdate =
	(
		update: TRPCMutationInput<"receiptParticipants.update">["update"],
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
		update: TRPCMutationInput<"receiptParticipants.update">["update"],
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

export const options: UseContextedMutationOptions<
	"receiptParticipants.update",
	{ selfUserId: UsersId }
> = {
	onMutate: (controllerContext) => (variables) =>
		cache.receipts.updateRevert(controllerContext, {
			get: (controller) =>
				controller.updateParticipant(
					variables.receiptId,
					variables.userId,
					applyUpdate(variables.update),
					getRevert(variables.update),
				),
			getPaged: undefined,
			getNonResolvedAmount: undefined,
		}),
	onSuccess:
		(controllerContext, { selfUserId }) =>
		(_result, variables) => {
			if (selfUserId === variables.userId) {
				cache.receipts.update(controllerContext, {
					get: undefined,
					getNonResolvedAmount: (controller) => {
						if (variables.update.type !== "resolved") {
							return;
						}
						const nextResolved = variables.update.resolved;
						controller.update((prevAmount) =>
							nextResolved ? prevAmount - 1 : prevAmount + 1,
						);
					},
					getPaged: undefined,
				});
			}
		},
	errorToastOptions: () => (error) => ({
		text: `Error updating a participant: ${error.message}`,
	}),
};
