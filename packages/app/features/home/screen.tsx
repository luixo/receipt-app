import React from "react";
import * as ReactNative from "react-native";
import * as HTMLElements from "@expo/html-elements";
import { TextLink } from "solito/link";
import { styled } from "app/styles";
import { useSx } from "dripsy";

const Wrapper = styled(ReactNative.View)({
	flex: 1,
	justifyContent: "center",
	alignItems: "center",
	p: 16,
});

const Header = styled(HTMLElements.H1)({
	fontWeight: "800",
	textAlign: "center",
});

const Container = styled(ReactNative.View)({ maxWidth: 600 });

const Spacer = styled(ReactNative.View)({ height: 32 });

const Paragraph = styled(HTMLElements.P)({ textAlign: "center" });

const Link = styled(HTMLElements.A)({ color: "blue" });

export const HomeScreen: React.FC = () => {
	const sx = useSx();
	return (
		<Wrapper>
			<Header>Welcome to Receipt App.</Header>
			<Container>
				<Paragraph>At the moment this is a blank app starter.</Paragraph>
				<Paragraph>
					App is based on{" "}
					<Link
						href="https://solito.dev"
						// @ts-expect-error react-native-web only types
						hrefAttrs={{
							target: "_blank",
						}}
					>
						Solito
					</Link>
					.
				</Paragraph>
			</Container>
			<Spacer />
			<TextLink
				href="/receipts/"
				textProps={{
					style: sx({ color: "blue" }),
				}}
			>
				Link to receipts page
			</TextLink>
		</Wrapper>
	);
};
