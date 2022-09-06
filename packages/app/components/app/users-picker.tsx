import React from "react";

import { Button, Loading } from "@nextui-org/react";
import {
	InfiniteData,
	UseInfiniteQueryResult,
	InfiniteQueryObserverSuccessResult,
} from "@tanstack/react-query";

import { ButtonsGroup } from "app/components/buttons-group";
import { QueryErrorMessage } from "app/components/error-message";
import { TRPCError } from "app/trpc";
import { UsersId } from "next-app/src/db/models";

type InnerProps<Data, User> = {
	type: "linear" | "block";
	query: InfiniteQueryObserverSuccessResult<Data, TRPCError>;
	extractUsers: (data: InfiniteData<Data>) => User[];
	extractDetails: (user: User) => { id: UsersId; name: string };
	selectedUsers: User[];
	getBreakIndex?: (data: InfiniteData<Data>) => number | undefined;
	onUserClick: (user: User) => void;
	loadMore: () => void;
	disabled?: boolean;
};

const UsersPickerInner = <Data, User>({
	type,
	query,
	extractUsers,
	extractDetails,
	selectedUsers,
	getBreakIndex,
	onUserClick,
	loadMore,
	disabled,
}: InnerProps<Data, User>) => {
	const users = extractUsers(query.data);
	const selectedIds = selectedUsers.map((user) => extractDetails(user).id);
	return (
		<ButtonsGroup
			type={type}
			buttons={users}
			extractDetails={extractDetails}
			// TODO: move buttonProps to React.useCallback
			// When slowdown of tsc is resolved
			buttonProps={(user) => ({
				auto: true,
				flat: true,
				disabled,
				color: selectedIds.includes(extractDetails(user).id)
					? "success"
					: undefined,
			})}
			breakIndex={getBreakIndex?.(query.data)}
			onClick={onUserClick}
		>
			{query.hasNextPage ? (
				<Button
					auto
					flat
					disabled={query.isLoading || query.isFetchingNextPage}
					color="secondary"
					onClick={loadMore}
				>
					{query.isLoading || query.isFetchingNextPage ? (
						<Loading size="sm" />
					) : (
						"Load more"
					)}
				</Button>
			) : null}
		</ButtonsGroup>
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
	return <UsersPickerInner {...props} query={query} />;
};
