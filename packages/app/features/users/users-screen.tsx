import React from "react";

import { BackButton } from "app/components/back-button";
import { InfiniteQueryWrapper } from "app/components/infinite-query-wrapper";
import { QueryWrapper } from "app/components/query-wrapper";
import { ConnectionIntentions } from "app/features/connection-intentions/connection-intentions";
import { trpc } from "app/trpc";
import {
	DEFAULT_INPUT,
	usersGetPagedNextPage,
} from "app/utils/queries/users-get-paged";
import { ScrollView } from "app/utils/styles";

import { AddUserForm } from "./add-user-form";
import { Users } from "./users";

export const UsersScreen: React.FC = () => {
	const usersInput = DEFAULT_INPUT;
	const usersQuery = trpc.useInfiniteQuery(["users.get-paged", usersInput], {
		getNextPageParam: usersGetPagedNextPage,
	});
	const connectionIntentionsQuery = trpc.useQuery([
		"account-connection-intentions.get-all",
	]);

	return (
		<ScrollView>
			<BackButton href="/" />
			<AddUserForm input={DEFAULT_INPUT} />
			<QueryWrapper query={connectionIntentionsQuery} pagedInput={usersInput}>
				{ConnectionIntentions}
			</QueryWrapper>
			<InfiniteQueryWrapper query={usersQuery}>{Users}</InfiniteQueryWrapper>
		</ScrollView>
	);
};
