import React from "react";

import { MdDoneAll as DoneIcon } from "react-icons/md";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import { ReceiptsId, UsersId } from "next-app/db/models";

type Props = {
	receiptId: ReceiptsId;
	userId: UsersId;
	resolved: boolean | null;
	readOnly?: boolean;
} & Omit<React.ComponentProps<typeof IconButton>, "onClick" | "color">;

export const ReceiptParticipantResolvedButton: React.FC<Props> = ({
	receiptId,
	userId,
	resolved,
	readOnly,
	css,
	...props
}) => {
	const updateReceiptMutation = trpc.useMutation(
		"receipt-participants.update",
		useTrpcMutationOptions(cache.receiptParticipants.update.mutationOptions, {
			isSelfAccount: true,
		})
	);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			receiptId,
			userId,
			update: { type: "resolved", resolved: !resolved },
		});
	}, [updateReceiptMutation, receiptId, userId, resolved]);
	return (
		<IconButton
			{...props}
			isLoading={updateReceiptMutation.isLoading || props.isLoading}
			disabled={resolved === null || props.disabled}
			color={resolved ? "success" : "warning"}
			onClick={readOnly ? undefined : switchResolved}
			animated={readOnly ? false : props.animated}
			css={{ ...css, cursor: readOnly ? "default" : css?.cursor }}
		>
			<DoneIcon size={24} />
		</IconButton>
	);
};
