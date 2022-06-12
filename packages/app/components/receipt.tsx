import React from "react";
import * as ReactNative from "react-native";
import { TextLink } from "../utils/styles";
import { TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";

type Props = {
	data: TRPCQueryOutput<"receipts.get">;
};

export const Receipt: React.FC<Props> = ({ data: receipt }) => {
	return (
		<Block>
			<TextLink href={`/receipts/${receipt.id}/`}>{receipt.name}</TextLink>
			<ReactNative.Text>Currency: {receipt.currency}</ReactNative.Text>
			<ReactNative.Text>Sum: {receipt.sum}</ReactNative.Text>
		</Block>
	);
};
