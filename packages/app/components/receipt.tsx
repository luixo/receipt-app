import React from "react";
import * as ReactNative from "react-native";
import { styled, TextLink } from "../styles";
import { TRPCQueryOutput } from "../trpc";

const Wrapper = styled(ReactNative.ScrollView)({
	borderWidth: "$hairline",
	borderStyle: "$solid",
	borderColor: "$muted",
	padding: "$m",
	flex: 1,
	cursor: "pointer",
	width: "$full",
});

type Props = {
	receipt: TRPCQueryOutput<"receipts.previews">[number];
};

export const Receipt: React.FC<Props> = ({ receipt }) => {
	return (
		<Wrapper>
			<TextLink href={`/receipts/${receipt.id}/`}>{receipt.name}</TextLink>
		</Wrapper>
	);
};
