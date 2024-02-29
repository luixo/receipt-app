import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components";
import * as mutations from "~mutations";

import { ReceiptSnippet } from "./receipt-snippet";

type Props = {
	intention: TRPCQueryOutput<"receiptTransferIntentions.getAll">["outbound"][number];
};

export const OutboundReceiptTransferIntention: React.FC<Props> = ({
	intention,
}) => {
	const removeIntentionMutation =
		trpc.receiptTransferIntentions.remove.useMutation(
			useTrpcMutationOptions(
				mutations.receiptTransferIntentions.remove.options,
			),
		);
	const removeIntention = React.useCallback(() => {
		removeIntentionMutation.mutate({
			receiptId: intention.receipt.id,
		});
	}, [removeIntentionMutation, intention.receipt.id]);

	return (
		<View
			className="items-start gap-2"
			testID="outbound-receipt-transfer-intention"
		>
			<ReceiptSnippet receipt={intention.receipt} />
			<View className="max-xs:flex-col flex-row justify-between gap-2 self-stretch">
				<LoadableUser id={intention.userId} />
				<Button
					color="warning"
					variant="bordered"
					isLoading={removeIntentionMutation.isPending}
					isDisabled={removeIntentionMutation.isPending}
					onClick={removeIntention}
					title="Remove receipt transfer"
				>
					Remove intention
				</Button>
			</View>
		</View>
	);
};
