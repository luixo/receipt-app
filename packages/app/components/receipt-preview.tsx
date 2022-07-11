import React from "react";

import { trpc, TRPCQueryOutput } from "../trpc";
import { Text, TextLink } from "../utils/styles";

import { Block } from "./utils/block";

type Props = {
	data: TRPCQueryOutput<"receipts.get-paged">[number];
};

export const ReceiptPreview: React.FC<Props> = ({ data: receipt }) => {
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
			<TextLink href={`/receipts/${receipt.id}/`}>{receipt.name}</TextLink>
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
