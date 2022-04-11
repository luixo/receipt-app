import React from "react";
import * as ReactNative from "react-native";
import { createParam } from "solito";
import { TextLink } from "solito/link";
import { styled } from "app/styles";

const Wrapper = styled(ReactNative.View)({
	flex: 1,
	justifyContent: "center",
	alignItems: "center",
});

const Text = styled(ReactNative.Text)({
	textAlign: "center",
	mb: 16,
	fontWeight: "bold",
});

const { useParam } = createParam<{ id: string }>();

export const ReceiptScreen: React.FC = () => {
	const [id] = useParam("id");

	return (
		<Wrapper>
			<Text>{`Receipt ID: ${id}`}</Text>

			<TextLink href="/">👈 Go Home</TextLink>
		</Wrapper>
	);
};
