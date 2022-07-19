import React from "react";
import * as ReactNative from "react-native";

import { BackButton } from "app/components/back-button";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { Spacer } from "app/components/spacer";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { trpc } from "app/trpc";
import { styled, H1, TextLink, Text } from "app/utils/styles";

const Wrapper = styled(ReactNative.View)({
	flex: 1,
	justifyContent: "center",
	alignItems: "center",
	padding: "md",
});

const Header = styled(H1)({
	fontWeight: "bold",
	textAlign: "center",
});

export const AccountScreen: React.FC = () => {
	const accountQuery = trpc.useQuery(["account.get"]);

	const trpcContext = trpc.useContext();
	const logoutMutation = trpc.useMutation("account.logout");
	const logout = useAsyncCallback(
		async (isMount) => {
			await logoutMutation.mutateAsync();
			if (!isMount()) {
				return;
			}
			trpcContext.invalidateQueries(["account.get"]);
			trpcContext.refetchQueries(["account.get"]);
		},
		[logoutMutation, trpcContext]
	);

	return (
		<Wrapper>
			<Header>
				{logoutMutation.status === "success"
					? "You are logged out"
					: `Your account is 
				${
					accountQuery.status === "success"
						? accountQuery.data.name
						: accountQuery.status
				}`}
			</Header>
			<Spacer />
			<BackButton href="/" />
			<Spacer />
			<ReactNative.Button
				title="Logout"
				disabled={logoutMutation.status === "success"}
				onPress={logout}
			/>
			<Spacer />
			<TextLink href="/account/change-password">Change password</TextLink>
			<MutationWrapper<"account.logout"> mutation={logoutMutation}>
				{() => <Text>Logout success!</Text>}
			</MutationWrapper>
		</Wrapper>
	);
};
