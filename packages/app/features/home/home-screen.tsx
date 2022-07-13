import React from "react";
import * as ReactNative from "react-native";

import { trpc } from "app/trpc";
import { styled, H1, TextLink, Text } from "app/utils/styles";

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
	const accountQuery = trpc.useQuery(["account.get"]);

	let authBaseElement = null;
	if (accountQuery.status === "success") {
		authBaseElement = (
			<>
				<Spacer />
				<TextLink href="/account">Account</TextLink>
				<Spacer />
				<TextLink href="/receipts">Receipts</TextLink>
				<Spacer />
				<TextLink href="/users">Users</TextLink>
			</>
		);
	} else if (accountQuery.status === "error") {
		if (accountQuery.error.data?.code === "UNAUTHORIZED") {
			authBaseElement = (
				<>
					<Spacer />
					<TextLink href="/register">Register</TextLink>
					<Spacer />
					<TextLink href="/login">Login</TextLink>
				</>
			);
		} else {
			authBaseElement = (
				<Text>Error on getting account: {accountQuery.error.message}</Text>
			);
		}
	} else {
		authBaseElement = <Text>Loading your account status..</Text>;
	}

	return (
		<Wrapper>
			<Header>Welcome to Receipt App</Header>
			{authBaseElement}
		</Wrapper>
	);
};
