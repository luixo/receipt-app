import React from "react";

import { InfiniteData } from "react-query";

import { cache } from "app/cache";
import { UsersPicker } from "app/components/app/users-picker";
import { trpc, TRPCInfiniteQueryOutput } from "app/trpc";

type UsersResult = TRPCInfiniteQueryOutput<"users.get-paged">;
type User = UsersResult["items"][number];

const extractUsers = (data: InfiniteData<UsersResult>) =>
	data.pages.reduce<User[]>((acc, page) => [...acc, ...page.items], []);

const extractDetails = ({ id, name }: User) => ({
	id,
	name,
});

type Props = {
	disabled: boolean;
	onUserClick: (user: User) => void;
	selectedUser: User;
};

export const DebtUsersPicker: React.FC<Props> = ({
	disabled,
	onUserClick,
	selectedUser,
}) => {
	const [input] = cache.users.getPaged.useStore();
	const query = trpc.useInfiniteQuery(["users.get-paged", input], {
		getNextPageParam: cache.users.getPaged.getNextPage,
	});
	const loadMore = React.useCallback(() => query.fetchNextPage(), [query]);
	return (
		<UsersPicker
			type="linear"
			query={query}
			extractUsers={extractUsers}
			extractDetails={extractDetails}
			selectedUsers={selectedUser ? [selectedUser] : []}
			onUserClick={onUserClick}
			loadMore={loadMore}
			disabled={disabled}
		/>
	);
};
