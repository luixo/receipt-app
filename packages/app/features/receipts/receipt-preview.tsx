import React from "react";

import { Block } from "app/components/block";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { updateReceiptName } from "app/utils/queries/receipts-get-name";
import { Text, TextLink } from "app/utils/styles";

type Props = {
	data: TRPCQueryOutput<"receipts.get-paged">["items"][number];
};

export const ReceiptPreview: React.FC<Props> = ({ data: receipt }) => {
	const trpcContext = trpc.useContext();
	const setReceiptName = React.useCallback(
		() => updateReceiptName(trpcContext, { id: receipt.id }, receipt.name),
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
		<Block>
			<TextLink
				href={`/receipts/${receipt.id}/`}
				onClick={setReceiptName}
				legacyBehavior={false}
			>
				{receipt.name}
			</TextLink>
			<Text>Currency: {currency}</Text>
			<Text>Role: {receipt.role}</Text>
			<Text>Issued: {receipt.issued.toLocaleDateString()}</Text>
			<Text>Resolved: {receipt.receiptResolved.toString()}</Text>
			<Text>
				Resolved participant:{" "}
				{receipt.participantResolved?.toString() ?? "unknown"}
			</Text>
		</Block>
	);
};
