import React from "react";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { DoneIcon, UndoneIcon } from "~components/icons";
import type { ReceiptsId, UsersId } from "~db/models";
import { options as receiptParticipantsUpdateOptions } from "~mutations/receipt-participants/update";

type Props = {
	receiptId: ReceiptsId;
	userId: UsersId;
	selfUserId?: UsersId;
	resolved: boolean | undefined;
} & Omit<
	React.ComponentProps<typeof Button>,
	"onClick" | "color" | "isIconOnly"
>;

export const ReceiptParticipantResolvedButton: React.FC<Props> = ({
	receiptId,
	userId,
	selfUserId,
	resolved,
	...props
}) => {
	const updateReceiptMutation = trpc.receiptParticipants.update.useMutation(
		useTrpcMutationOptions(receiptParticipantsUpdateOptions, {
			context: { selfUserId: selfUserId || "unknown" },
		}),
	);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			receiptId,
			userId,
			update: { type: "resolved", resolved: !resolved },
		});
	}, [updateReceiptMutation, receiptId, userId, resolved]);
	return (
		<Button
			{...props}
			isLoading={updateReceiptMutation.isPending || props.isLoading}
			isDisabled={
				resolved === undefined || props.isDisabled || selfUserId !== userId
			}
			color={
				resolved ? "success" : resolved === undefined ? "default" : "warning"
			}
			onClick={switchResolved}
			isIconOnly
		>
			{resolved ? <DoneIcon size={24} /> : <UndoneIcon size={24} />}
		</Button>
	);
};
