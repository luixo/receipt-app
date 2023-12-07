import React from "react";

import { Button } from "@nextui-org/react-tailwind";
import {
	MdDoneAll as DoneIcon,
	MdRemoveDone as UndoneIcon,
} from "react-icons/md";

import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import type { ReceiptsId, UsersId } from "next-app/db/models";

type Props = {
	receiptId: ReceiptsId;
	userId: UsersId;
	selfUserId?: UsersId;
	resolved: boolean | null;
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
		useTrpcMutationOptions(mutations.receiptParticipants.update.options, {
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
			isLoading={updateReceiptMutation.isLoading || props.isLoading}
			isDisabled={
				resolved === null || props.isDisabled || selfUserId !== userId
			}
			color={resolved ? "success" : resolved === null ? "default" : "warning"}
			onClick={switchResolved}
			isIconOnly
		>
			{resolved ? <DoneIcon size={24} /> : <UndoneIcon size={24} />}
		</Button>
	);
};
