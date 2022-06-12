import React from "react";
import * as ReactNative from "react-native";
import { TextLink } from "../utils/styles";
import { trpc, TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { QueryWrapper } from "./utils/query-wrapper";
import { ReceiptOwner } from "./receipt-owner";

type Props = {
	data: TRPCQueryOutput<"receipts.get">;
};

export const Receipt: React.FC<Props> = ({ data: receipt }) => {
	const ownerQuery = trpc.useQuery([
		"users.get",
		{ accountId: receipt.ownerAccountId },
	]);
	return (
		<Block>
			<TextLink href={`/receipts/${receipt.id}/`}>{receipt.name}</TextLink>
			<ReactNative.Text>Currency: {receipt.currency}</ReactNative.Text>
			<ReactNative.Text>Sum: {receipt.sum}</ReactNative.Text>
			<ReactNative.Text>Role: {receipt.role}</ReactNative.Text>
			<QueryWrapper query={ownerQuery}>{ReceiptOwner}</QueryWrapper>
		</Block>
	);
};
