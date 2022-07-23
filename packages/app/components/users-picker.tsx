import React from "react";

import { Button, Container, Loading, Spacer } from "@nextui-org/react";
import {
	InfiniteData,
	UseInfiniteQueryResult,
	InfiniteQueryObserverSuccessResult,
} from "react-query";

import { QueryErrorMessage } from "app/components/query-error-message";
import { TRPCError } from "app/trpc";
import { UsersId } from "next-app/src/db/models";

type InnerProps<Data, User> = {
	query: InfiniteQueryObserverSuccessResult<Data, TRPCError>;
	extractUsers: (data: InfiniteData<Data>) => User[];
	extractDetails: (user: User) => { id: UsersId; name: string };
	selectedUser?: User;
	onChange: (nextUser: User) => void;
	loadMore: () => void;
};

const UsersPickerInner = <Data, User>({
	query,
	extractUsers,
	extractDetails,
	selectedUser,
	onChange,
	loadMore,
}: InnerProps<Data, User>) => {
	const users = extractUsers(query.data);
	const selectedId = selectedUser ? extractDetails(selectedUser).id : undefined;
	React.useEffect(() => {
		const matchedUser = users.find(
			(user) => extractDetails(user).id === selectedId
		);
		if (!matchedUser && users[0]) {
			onChange(users[0]);
		}
	}, [users, onChange, extractDetails, selectedId]);
	return (
		<Container display="flex" wrap="nowrap" css={{ p: 0, overflowX: "scroll" }}>
			{users.map((user, index) => {
				const { id, name } = extractDetails(user);
				return (
					<React.Fragment key={id}>
						{index === 0 ? null : <Spacer x={0.5} />}
						<Button
							auto
							flat
							onClick={() => onChange(user)}
							color={id === selectedId ? "success" : undefined}
						>
							{name}
						</Button>
					</React.Fragment>
				);
			})}
			<Spacer x={0.5} />
			<Button
				auto
				flat
				disabled={
					query.isLoading || query.isFetchingNextPage || !query.hasNextPage
				}
				color="secondary"
				onClick={loadMore}
			>
				{query.isLoading || query.isFetchingNextPage ? (
					<Loading size="sm" />
				) : (
					"Load more"
				)}
			</Button>
		</Container>
	);
};

type Props<Data, User> = Omit<InnerProps<Data, User>, "query"> & {
	query: UseInfiniteQueryResult<Data, TRPCError>;
};

export const UsersPicker = <Data, User>({
	query,
	...props
}: Props<Data, User>) => {
	if (query.status === "loading") {
		return <Loading />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return <UsersPickerInner {...props} query={query} />;
};
