import React from "react";
import * as ReactNative from "react-native";
import { createParam } from "solito";
import { TextLink } from "solito/link";
import { styled } from "app/styles";
import { fetch } from "app/fetch";

const Wrapper = styled(ReactNative.ScrollView)({
	flex: 1,
});

const Text = styled(ReactNative.Text)({
	textAlign: "center",
	mb: 16,
	fontWeight: "bold",
});

const styles = ReactNative.StyleSheet.create({
	scrollContainer: {
		justifyContent: "center",
		alignItems: "center",
		flexGrow: 1,
	},
});

const { useParam } = createParam<{ id: string }>();

export const ReceiptScreen: React.FC = () => {
	const [id] = useParam("id");
	const [pingText, setPingText] = React.useState("Waiting..");
	React.useEffect(() => {
		const runAsyncAction = async () => {
			const response = await fetch(`/api/ping`);
			const responseText = await response.text();
			setPingText(responseText);
		};
		runAsyncAction();
	}, []);

	return (
		<Wrapper contentContainerStyle={styles.scrollContainer}>
			<Text>{`Receipt ID: ${id}`}</Text>
			<Text>{`Ping text: ${pingText}`}</Text>

			<TextLink href="/">👈 Go Home</TextLink>
		</Wrapper>
	);
};
