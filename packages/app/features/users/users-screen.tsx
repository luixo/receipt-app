import React from "react";
import * as ReactNative from "react-native";

import { ButtonLink } from "app/components/button-link";
import { InfiniteQueryWrapper } from "app/components/infinite-query-wrapper";
import { trpc } from "app/trpc";
import {
	usersGetPagedInputStore,
	usersGetPagedNextPage,
} from "app/utils/queries/users-get-paged";
import { Text, ScrollView, styled } from "app/utils/styles";

import { Users } from "./users";

const Header = styled(ReactNative.View)({
	flexDirection: "row",
});
const Title = styled(Text)({
	flex: 1,
	alignSelf: "center",
	padding: "$m",
	fontSize: "$large",
});
const Buttons = styled(ReactNative.View)({
	flexDirection: "row",
	flexShrink: 0,
});

export const UsersScreen: React.FC = () => {
	const usersGetPagedInput = usersGetPagedInputStore();
	const usersQuery = trpc.useInfiniteQuery(
		["users.get-paged", usersGetPagedInput],
		{ getNextPageParam: usersGetPagedNextPage }
	);

	return (
		<ReactNative.View>
			<Header>
				<Title>Users</Title>
				<Buttons>
					<ButtonLink href="/users/add">+</ButtonLink>
					<ButtonLink href="/users/connections">{"<>"}</ButtonLink>
				</Buttons>
			</Header>
			<ScrollView>
				<InfiniteQueryWrapper query={usersQuery}>{Users}</InfiniteQueryWrapper>
			</ScrollView>
		</ReactNative.View>
	);
};
