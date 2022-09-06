import React from "react";

import { Text, styled } from "@nextui-org/react";

import { cache } from "app/cache";
import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { ReceiptResolvedParticipantsButton } from "app/components/app/receipt-resolved-participants-button";
import { Grid } from "app/components/grid";
import { IconButton } from "app/components/icon-button";
import { Link } from "app/components/link";
import { LockedIcon } from "app/components/locked-icon";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";

const TitleLink = styled(Link, {
	display: "flex",
	flexDirection: "column",
	width: "100%",
});

type Props = {
	receipt: TRPCQueryOutput<"receipts.getPaged">["items"][number];
};

export const ReceiptPreview: React.FC<Props> = ({ receipt }) => {
	const trpcContext = trpc.useContext();
	const setReceiptName = React.useCallback(
		() => cache.receipts.getName.update(trpcContext, receipt.id, receipt.name),
		[trpcContext, receipt.id, receipt.name]
	);
	const currency = useFormattedCurrency(receipt.currency);
	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(cache.receipts.update.mutationOptions)
	);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			id: receipt.id,
			update: { type: "locked", value: !receipt.locked },
		});
	}, [updateReceiptMutation, receipt.id, receipt.locked]);
	return (
		<>
			<Grid
				css={{ whiteSpace: "normal", flexDirection: "column" }}
				defaultCol={7.5}
			>
				<TitleLink href={`/receipts/${receipt.id}/`}>
					<Text onClick={setReceiptName} css={{ cursor: "pointer" }}>
						{receipt.name} ({currency})
					</Text>
				</TitleLink>
				<Text small css={{ color: "$accents7" }}>
					{receipt.issued.toLocaleDateString()}
				</Text>
			</Grid>
			<Grid defaultCol={1.5} justify="center" alignItems="center">
				{receipt.participantResolved === null ? null : (
					<ReceiptParticipantResolvedButton
						light
						receiptId={receipt.id}
						localUserId={receipt.localUserId}
						remoteUserId={receipt.remoteUserId}
						resolved={receipt.participantResolved}
					/>
				)}
			</Grid>
			<Grid defaultCol={1.5} justify="center" alignItems="center">
				<IconButton
					light
					isLoading={updateReceiptMutation.isLoading}
					disabled={receipt.role !== "owner"}
					color={receipt.locked ? "success" : "warning"}
					icon={<LockedIcon locked={receipt.locked} />}
					onClick={switchResolved}
				/>
			</Grid>
			<Grid defaultCol={1.5} justify="center" alignItems="center">
				<ReceiptResolvedParticipantsButton
					light
					css={{ px: 0 }}
					receiptId={receipt.id}
					selfOwnedReceipt={receipt.role === "owner"}
				/>
			</Grid>
		</>
	);
};
