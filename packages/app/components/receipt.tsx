import React from "react";
import * as ReactNative from "react-native";
import { TextLink } from "solito/link";
import { styled } from "../styles";
import { TRPCQueryOutput } from "../trpc";

const Wrapper = styled(ReactNative.ScrollView)({
	borderWidth: 1,
	borderStyle: "solid",
	borderColor: "black",
	padding: 16,
	flex: 1,
	cursor: "pointer",
});

const Name = styled(TextLink)();

type Props = {
	receipt: TRPCQueryOutput<"receipts.previews">[number];
};

export const Receipt: React.FC<Props> = ({ receipt }) => {
	return (
		<Wrapper>
			<Name href={`/receipts/${receipt.id}/`}>{receipt.name}</Name>
		</Wrapper>
	);
};
