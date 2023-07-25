import React from "react";

import { Text, styled, Card } from "@nextui-org/react";

import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { ReceiptResolvedParticipantsButton } from "app/components/app/receipt-resolved-participants-button";
import { Grid } from "app/components/grid";
import { IconButton } from "app/components/icon-button";
import { Link } from "app/components/link";
import { LockedIcon } from "app/components/locked-icon";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useMatchMediaValue } from "app/hooks/use-match-media-value";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";

const TitleLink = styled(Link, {
	display: "flex",
	flexDirection: "column",
	width: "100%",
});

export const getWidths = (
	overflow: boolean,
): [number, number, number, number, number] => {
	if (overflow) {
		return [8, 4, 4, 4, 4];
	}
	return [7, 2, 1, 1, 1];
};

type Props = {
	receipt: TRPCQueryOutput<"receipts.getPaged">["items"][number];
};

export const ReceiptPreview: React.FC<Props> = ({ receipt }) => {
	const currency = useFormattedCurrency(receipt.currencyCode);
	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(mutations.receipts.update.options),
	);
	const receiptLocked = Boolean(receipt.lockedTimestamp);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			id: receipt.id,
			update: { type: "locked", locked: !receiptLocked },
		});
	}, [updateReceiptMutation, receipt.id, receiptLocked]);
	const overflow = useMatchMediaValue(false, { lessSm: true });
	const [nameWidth, sumWidth, ...buttonsWidth] = getWidths(overflow);
	return (
		<>
			{overflow ? <Card.Divider /> : null}
			<Grid
				css={{
					whiteSpace: "pre",
					flexDirection: "column",
					...(overflow ? { pb: 0 } : {}),
				}}
				defaultCol={nameWidth}
			>
				<TitleLink
					href={`/receipts/${receipt.id}/`}
					css={{ cursor: "pointer" }}
				>
					<Text>{receipt.name}</Text>
				</TitleLink>
				<Text small css={{ color: "$accents7" }}>
					{receipt.issued.toLocaleDateString()}
				</Text>
			</Grid>
			<Grid
				defaultCol={sumWidth}
				alignItems="center"
				justify="flex-end"
				css={{ textAlign: "end", ...(overflow ? { pb: 0 } : {}) }}
			>
				<Text b>
					{receipt.sum} {currency}
				</Text>
			</Grid>
			<Grid defaultCol={buttonsWidth[0]} justify="center" alignItems="center">
				{receipt.participantResolved === null ? null : (
					<ReceiptParticipantResolvedButton
						light
						receiptId={receipt.id}
						userId={receipt.remoteUserId}
						selfUserId={receipt.remoteUserId}
						resolved={receipt.participantResolved}
					/>
				)}
			</Grid>
			<Grid defaultCol={buttonsWidth[1]} justify="center" alignItems="center">
				<IconButton
					light
					isLoading={updateReceiptMutation.isLoading}
					disabled={receipt.role !== "owner"}
					color={receiptLocked ? "success" : "warning"}
					icon={<LockedIcon locked={receiptLocked} />}
					onClick={switchResolved}
				/>
			</Grid>
			<Grid defaultCol={buttonsWidth[2]} justify="center" alignItems="center">
				<ReceiptResolvedParticipantsButton
					light
					css={{ px: 0 }}
					receiptId={receipt.id}
				/>
			</Grid>
		</>
	);
};
