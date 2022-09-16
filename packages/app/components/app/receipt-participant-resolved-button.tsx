import React from "react";

import {
	MdDoneAll as DoneIcon,
	MdRemoveDone as UndoneIcon,
} from "react-icons/md";

import { IconButton } from "app/components/icon-button";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import { ReceiptsId, UsersId } from "next-app/db/models";

type Props = {
	receiptId: ReceiptsId;
	remoteUserId: UsersId;
	localUserId: UsersId;
	resolved: boolean | null;
} & Omit<React.ComponentProps<typeof IconButton>, "onClick" | "color">;

export const ReceiptParticipantResolvedButton: React.FC<Props> = ({
	receiptId,
	remoteUserId,
	localUserId,
	resolved,
	...props
}) => {
	const accountQuery = trpc.account.get.useQuery();
	const updateReceiptMutation = trpc.receiptParticipants.update.useMutation(
		useTrpcMutationOptions(mutations.receiptParticipants.update.options, {
			context: {
				selfAccountId: accountQuery.data?.id ?? "unknown",
			},
		})
	);
	const switchResolved = React.useCallback(() => {
		if (!localUserId) {
			throw new Error(
				"No localUserId in ReceiptParticipantResolvedButton component, cannot mutate"
			);
		}
		updateReceiptMutation.mutate({
			receiptId,
			userId: remoteUserId,
			update: { type: "resolved", resolved: !resolved },
		});
	}, [updateReceiptMutation, receiptId, remoteUserId, localUserId, resolved]);
	const accountQueryNotLoaded = accountQuery.status !== "success";
	return (
		<IconButton
			{...props}
			isLoading={updateReceiptMutation.isLoading || props.isLoading}
			disabled={resolved === null || props.disabled || accountQueryNotLoaded}
			color={resolved ? "success" : "warning"}
			onClick={switchResolved}
			icon={resolved ? <DoneIcon size={24} /> : <UndoneIcon size={24} />}
		/>
	);
};
