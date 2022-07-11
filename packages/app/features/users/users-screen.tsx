import React from "react";

import { AddUserForm } from "../../components/add-user-form";
import { ConnectionIntentions } from "../../components/connection-intentions";
import { Users } from "../../components/users";
import { BackButton } from "../../components/utils/back-button";
import { InfiniteQueryWrapper } from "../../components/utils/infinite-query-wrapper";
import { QueryWrapper } from "../../components/utils/query-wrapper";
import { trpc } from "../../trpc";
import { DEFAULT_INPUT } from "../../utils/queries/users-get-paged";
import { ScrollView } from "../../utils/styles";

export const UsersScreen: React.FC = () => {
	const usersInput = DEFAULT_INPUT;
	const usersQuery = trpc.useInfiniteQuery(["users.get-paged", usersInput]);
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
