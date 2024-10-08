import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { options as receiptTransferIntentionsAcceptOptions } from "~mutations/receipt-transfer-intentions/accept";
import { options as receiptTransferIntentionsRemoveOptions } from "~mutations/receipt-transfer-intentions/remove";

import { ReceiptSnippet } from "./receipt-snippet";

type Props = {
	intention: TRPCQueryOutput<"receiptTransferIntentions.getAll">["inbound"][number];
};

export const InboundReceiptTransferIntention: React.FC<Props> = ({
	intention,
}) => {
	const acceptTransferMutation =
		trpc.receiptTransferIntentions.accept.useMutation(
			useTrpcMutationOptions(receiptTransferIntentionsAcceptOptions),
		);
	const acceptTransfer = React.useCallback(() => {
		acceptTransferMutation.mutate({
			receiptId: intention.receipt.id,
		});
	}, [acceptTransferMutation, intention.receipt.id]);

	const rejectTransferMutation =
		trpc.receiptTransferIntentions.remove.useMutation(
			useTrpcMutationOptions(receiptTransferIntentionsRemoveOptions),
		);
	const rejectTransfer = React.useCallback(() => {
		rejectTransferMutation.mutate({
			receiptId: intention.receipt.id,
		});
	}, [rejectTransferMutation, intention.receipt.id]);

	const isPending =
		acceptTransferMutation.isPending || rejectTransferMutation.isPending;
	return (
		<View
			className="items-start gap-2"
			testID="inbound-receipt-transfer-intention"
		>
			<ReceiptSnippet receipt={intention.receipt} />
			<View className="flex-row items-start justify-between gap-2 self-stretch max-sm:flex-col">
				<LoadableUser id={intention.userId} />
				<View className="flex-row gap-2">
					<Button
						color="primary"
						isDisabled={isPending}
						isLoading={acceptTransferMutation.isPending}
						onClick={acceptTransfer}
						title="Accept receipt transfer"
					>
						Accept
					</Button>
					<Button
						color="warning"
						variant="bordered"
						isDisabled={isPending}
						isLoading={rejectTransferMutation.isPending}
						onClick={rejectTransfer}
						title="Reject receipt transfer"
					>
						Reject
					</Button>
				</View>
			</View>
		</View>
	);
};
