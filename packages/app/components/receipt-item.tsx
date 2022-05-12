import React from "react";
import * as ReactNative from "react-native";
import { styled } from "../styles";
import { TRPCQueryOutput } from "../trpc";

const Wrapper = styled(ReactNative.ScrollView)({
	borderWidth: 1,
	borderStyle: "solid",
	borderColor: "black",
	padding: 16,
	flex: 1,
});

const Name = styled(ReactNative.Text)({});

type Props = {
	receiptItem: TRPCQueryOutput<"receipts.items">[number];
};

export const ReceiptItem: React.FC<Props> = ({ receiptItem }) => {
	return (
		<Wrapper>
			<Name>{receiptItem.name}</Name>
		</Wrapper>
	);
};
