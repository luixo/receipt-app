import React from "react";

import { BackButton } from "app/components/back-button";
import { InfiniteQueryWrapper } from "app/components/infinite-query-wrapper";
import { QueryWrapper } from "app/components/query-wrapper";
import { ConnectionIntentions } from "app/features/connection-intentions/connection-intentions";
import { trpc } from "app/trpc";
import {
	usersGetPagedInputStore,
	usersGetPagedNextPage,
} from "app/utils/queries/users-get-paged";
import { ScrollView } from "app/utils/styles";

import { AddUserForm } from "./add-user-form";
import { Users } from "./users";

export const UsersScreen: React.FC = () => {
	const usersGetPagedInput = usersGetPagedInputStore();
	const usersQuery = trpc.useInfiniteQuery(
		["users.get-paged", usersGetPagedInput],
		{
			getNextPageParam: usersGetPagedNextPage,
		}
	);
	const connectionIntentionsQuery = trpc.useQuery([
		"account-connection-intentions.get-all",
	]);

	return (
		<ScrollView>
			<BackButton href="/" />
			<AddUserForm />
			<QueryWrapper query={connectionIntentionsQuery}>
				{ConnectionIntentions}
			</QueryWrapper>
			<InfiniteQueryWrapper query={usersQuery}>{Users}</InfiniteQueryWrapper>
		</ScrollView>
	);
};
