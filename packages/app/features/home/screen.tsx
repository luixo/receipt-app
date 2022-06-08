import React from "react";
import * as ReactNative from "react-native";
import { styled, H1, P, A, TextLink } from "../../utils/styles";
import { useSx } from "dripsy";

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

const Container = styled(ReactNative.View)({ maxWidth: "$container" });

const Spacer = styled(ReactNative.View)({ marginTop: "$l" });

const Paragraph = styled(P)({ textAlign: "center" });

const Link = styled(A)({ color: "$primary" });

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
					style: sx({ color: "$primary" }),
				}}
			>
				Link to receipts page
			</TextLink>
		</Wrapper>
	);
};
