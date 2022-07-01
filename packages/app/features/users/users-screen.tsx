import React from "react";
import { trpc } from "../../trpc";
import { InfiniteQueryWrapper } from "../../components/utils/infinite-query-wrapper";
import { Users } from "../../components/users";
import { BackButton } from "../../components/utils/back-button";
import { ScrollView } from "../../utils/styles";
import { DEFAULT_INPUT } from "../../utils/queries/users-get-paged";

export const UsersScreen: React.FC = () => {
	const usersQuery = trpc.useInfiniteQuery(["users.get-paged", DEFAULT_INPUT]);

	return (
		<ScrollView>
			<BackButton href="/" />
			<InfiniteQueryWrapper query={usersQuery}>{Users}</InfiniteQueryWrapper>
		</ScrollView>
	);
};
