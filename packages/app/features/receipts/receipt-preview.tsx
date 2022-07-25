import React from "react";

import { Link, Text, Grid, styled } from "@nextui-org/react";

import { cache } from "app/cache";
import { ReceiptAccountedButton } from "app/components/receipt-accounted-button";
import { ReceiptParticipantResolvedButton } from "app/components/receipt-participant-resolved-button";
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
	const currenciesListQuery = trpc.useQuery([
		"currency.get-list",
		{ locale: "en" },
	]);
	const currency = currenciesListQuery.data
		? currenciesListQuery.data.find(
				(element) => element.code === receipt.currency
		  )?.symbol
		: receipt.currency;
	return (
		<>
			<Grid css={{ whiteSpace: "normal" }} xs={8}>
				<TitleLink href={`/receipts/${receipt.id}/`} onClick={setReceiptName}>
					<Text>
						{receipt.name} ({currency})
					</Text>
					<Text small css={{ color: "$accents7" }}>
						{receipt.issued.toLocaleDateString()}
					</Text>
				</TitleLink>
			</Grid>
			<Grid xs={2}>
				<ReceiptParticipantResolvedButton
					light
					receiptId={receipt.id}
					userId={receipt.userId}
					resolved={receipt.participantResolved}
				/>
			</Grid>
			<Grid xs={2}>
				<ReceiptAccountedButton
					light
					receiptId={receipt.id}
					resolved={receipt.resolved}
				/>
			</Grid>
		</>
	);
};
