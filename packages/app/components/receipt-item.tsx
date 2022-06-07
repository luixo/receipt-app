import React from "react";
import * as ReactNative from "react-native";
import { styled, Text } from "../styles";
import { TRPCQueryOutput } from "../trpc";

const Wrapper = styled(ReactNative.ScrollView)({
	borderWidth: "$hairline",
	borderStyle: "$solid",
	borderColor: "$muted",
	padding: "$m",
	flex: 1,
});

const Name = styled(Text)({});

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
