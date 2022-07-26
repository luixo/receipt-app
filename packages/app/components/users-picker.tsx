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
	type: "line" | "wrap";
	query: InfiniteQueryObserverSuccessResult<Data, TRPCError>;
	extractUsers: (data: InfiniteData<Data>) => User[];
	extractDetails: (user: User) => { id: UsersId; name: string };
	selectedUser?: User;
	onChange: (nextUser: User) => void;
	loadMore: () => void;
	disabled?: boolean;
};

const UsersPickerInner = <Data, User>({
	type,
	query,
	extractUsers,
	extractDetails,
	selectedUser,
	onChange,
	loadMore,
	disabled,
}: InnerProps<Data, User>) => {
	const users = extractUsers(query.data);
	const selectedId = selectedUser ? extractDetails(selectedUser).id : undefined;
	const isLine = type === "line";
	return (
		<Container
			display="flex"
			wrap={isLine ? "nowrap" : "wrap"}
			css={isLine ? { p: 0, overflowX: "scroll" } : { p: 0 }}
		>
			{users.map((user, index) => {
				const { id, name } = extractDetails(user);
				return (
					<React.Fragment key={id}>
						{index === 0 || !isLine ? null : <Spacer x={0.5} />}
						<Button
							auto
							flat
							disabled={disabled}
							onClick={() => onChange(user)}
							color={id === selectedId ? "success" : undefined}
							css={isLine ? undefined : { m: "$2" }}
						>
							{name}
						</Button>
					</React.Fragment>
				);
			})}
			{isLine ? <Spacer x={0.5} /> : null}
			{query.hasNextPage ? (
				<Button
					auto
					flat
					disabled={query.isLoading || query.isFetchingNextPage}
					color="secondary"
					onClick={loadMore}
					css={isLine ? undefined : { m: "$2" }}
				>
					{query.isLoading || query.isFetchingNextPage ? (
						<Loading size="sm" />
					) : (
						"Load more"
					)}
				</Button>
			) : null}
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
