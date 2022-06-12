import React from "react";
import * as ReactNative from "react-native";
import { styled, H1, TextLink } from "../../utils/styles";

const Wrapper = styled(ReactNative.View)({
	flex: 1,
	justifyContent: "center",
	alignItems: "center",
	padding: "$m",
});

const Header = styled(H1)({
	fontWeight: "$bold",
	textAlign: "center",
});

const Spacer = styled(ReactNative.View)({ marginTop: "$l" });

export const HomeScreen: React.FC = () => {
	return (
		<Wrapper>
			<Header>Welcome to Receipt App</Header>
			<Spacer />
			<TextLink href="/receipts">Receipts</TextLink>
		</Wrapper>
	);
};
