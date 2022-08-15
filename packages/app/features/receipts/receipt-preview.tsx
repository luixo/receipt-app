import React from "react";

import { Text, Grid, styled } from "@nextui-org/react";

import { cache } from "app/cache";
import { ReceiptAccountedButton } from "app/components/app/receipt-accounted-button";
import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { ReceiptResolvedParticipantsButton } from "app/components/app/receipt-resolved-participants-button";
import { Link } from "app/components/link";
import { trpc, TRPCQueryOutput } from "app/trpc";

const TitleLink = styled(Link, {
	display: "flex",
	flexDirection: "column",
	width: "100%",
});

type Props = {
	receipt: TRPCQueryOutput<"receipts.get-paged">["items"][number];
};

export const ReceiptPreview: React.FC<Props> = ({ receipt }) => {
	const trpcContext = trpc.useContext();
	const setReceiptName = React.useCallback(
		() => cache.receipts.getName.update(trpcContext, receipt.id, receipt.name),
		[trpcContext, receipt.id, receipt.name]
	);
	const currenciesListQuery = trpc.useQuery(
		["currency.get-list", { locale: "en" }],
		{ ssr: false }
	);
	const currency = currenciesListQuery.data
		? currenciesListQuery.data.list.find(
				(element) => element.code === receipt.currency
		  )?.symbol
		: receipt.currency;
	return (
		<>
			<Grid css={{ whiteSpace: "normal", flexDirection: "column" }} xs={7.5}>
				<TitleLink href={`/receipts/${receipt.id}/`}>
					<Text onClick={setReceiptName} css={{ cursor: "pointer" }}>
						{receipt.name} ({currency})
					</Text>
				</TitleLink>
				<Text small css={{ color: "$accents7" }}>
					{receipt.issued.toLocaleDateString()}
				</Text>
			</Grid>
			<Grid xs={1.5} justify="center">
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
			<Grid xs={1.5} justify="center">
				<ReceiptAccountedButton
					light
					receiptId={receipt.id}
					resolved={receipt.resolved}
				/>
			</Grid>
			<Grid xs={1.5} justify="center">
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
