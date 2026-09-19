import type { TRPCMutationInput } from "~app/trpc";
import type { TRPCReceiptParticipant } from "~app/trpc-types";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";
import type { SnapshotFn, UpdateFn } from "../types";

type ReceiptParticipant = TRPCReceiptParticipant;

const applyUpdate =
	(
		update: TRPCMutationInput<"receiptParticipants.update">["update"],
	): UpdateFn<ReceiptParticipant> =>
	(item) => {
		switch (update.type) {
			// We want this to blow up in case we add more cases
			// oxlint-disable-next-line typescript/no-unnecessary-condition
			case "role":
				return { ...item, role: update.role };
		}
	};

const getRevert =
	(
		update: TRPCMutationInput<"receiptParticipants.update">["update"],
	): SnapshotFn<ReceiptParticipant> =>
	(snapshot) =>
	(item) => {
		switch (update.type) {
			// We want this to blow up in case we add more cases
			// oxlint-disable-next-line typescript/no-unnecessary-condition
			case "role":
				return { ...item, role: snapshot.role };
		}
	};

export const options: UseContextedMutationOptions<"receiptParticipants.update"> =
	{
		mutationKey: "receiptParticipants.update",
		onMutate: (controllerContext) => (variables) =>
			updateRevertReceipts(controllerContext, {
				get: (controller) =>
					controller.updateParticipant(
						variables.receiptId,
						variables.userId,
						applyUpdate(variables.update),
						getRevert(variables.update),
					),
				getPaged: undefined,
			}),
		errorToastOptions:
			({ t }) =>
			(errors) => ({
				text: t("toasts.updateParticipant.error", {
					ns: "receipts",
					participantsCount: errors.length,
					errors,
				}),
			}),
	};
