import React from "react";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { DoneIcon, UndoneIcon } from "~components/icons";
import type { UsersId } from "~db/models";
import { options as receiptParticipantsUpdateOptions } from "~mutations/receipt-participants/update";

type Props = {
	userId: UsersId;
	resolved: boolean;
	receipt: TRPCQueryOutput<"receipts.get">;
} & Omit<
	React.ComponentProps<typeof Button>,
	"onClick" | "color" | "isIconOnly"
>;

export const ReceiptParticipantResolvedButton: React.FC<Props> = ({
	userId,
	resolved,
	receipt,
	...props
}) => {
	const selfParticipant = userId === receipt.selfUserId;
	const updateReceiptMutation = trpc.receiptParticipants.update.useMutation(
		useTrpcMutationOptions(receiptParticipantsUpdateOptions, {
			context: { selfUserId: receipt.selfUserId },
		}),
	);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			receiptId: receipt.id,
			userId,
			update: { type: "resolved", resolved: !resolved },
		});
	}, [updateReceiptMutation, receipt.id, userId, resolved]);
	return (
		<Button
			{...props}
			isLoading={updateReceiptMutation.isPending || props.isLoading}
			isDisabled={
				!selfParticipant || props.isDisabled || receipt.selfUserId !== userId
			}
			color={resolved ? "success" : !selfParticipant ? "default" : "warning"}
			onClick={switchResolved}
			isIconOnly
		>
			{resolved ? <DoneIcon size={24} /> : <UndoneIcon size={24} />}
		</Button>
	);
};
