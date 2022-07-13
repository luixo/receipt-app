import React from "react";

import { AddUserForm } from "app/components/add-user-form";
import { ConnectionIntentions } from "app/components/connection-intentions";
import { Users } from "app/components/users";
import { BackButton } from "app/components/utils/back-button";
import { InfiniteQueryWrapper } from "app/components/utils/infinite-query-wrapper";
import { QueryWrapper } from "app/components/utils/query-wrapper";
import { trpc } from "app/trpc";
import { DEFAULT_INPUT } from "app/utils/queries/users-get-paged";
import { ScrollView } from "app/utils/styles";

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
