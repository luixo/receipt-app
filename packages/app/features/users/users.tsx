import type React from "react";

import { keepPreviousData } from "@tanstack/react-query";

import { SkeletonUser } from "~app/components/app/user";
import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import type { SearchParamState } from "~app/hooks/use-navigation";
import type { TRPCQueryErrorResult, TRPCQueryInput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { AddIcon } from "~components/icons";
import { ButtonLink } from "~components/link";
import { Overlay } from "~components/overlay";
import { Pagination } from "~components/pagination";
import { Spinner } from "~components/spinner";
import type { UsersId } from "~db/models";

import { UserPreview } from "./user-preview";

type Input = TRPCQueryInput<"users.getPaged">;

const useUsersQuery = (input: Omit<Input, "cursor">, cursor: Input["cursor"]) =>
	trpc.users.getPaged.useQuery(
		{ ...input, cursor },
		{ placeholderData: keepPreviousData },
	);

const UserPreviews: React.FC<{ ids: UsersId[] }> = ({ ids }) => {
	const userQueries = trpc.useQueries((t) =>
		ids.map((id) => t.users.get({ id })),
	);
	if (userQueries.every((query) => query.status === "pending")) {
		return <Spinner size="lg" />;
	}
	if (userQueries.every((query) => query.status === "error")) {
		return (
			<QueryErrorMessage
				query={userQueries[0] as TRPCQueryErrorResult<"users.get">}
			/>
		);
	}

	return (
		<>
			{userQueries.map((userQuery, index) =>
				userQuery.status === "pending" ? (
					<SkeletonUser key={ids[index]} className="self-start" />
				) : userQuery.status === "error" ? (
					<QueryErrorMessage key={ids[index]} query={userQuery} />
				) : (
					<UserPreview key={ids[index]} user={userQuery.data} />
				),
			)}
		</>
	);
};

type Props = {
	limit: number;
	offsetState: SearchParamState<"/users", "offset">;
};

export const Users: React.FC<Props> = ({ limit, offsetState }) => {
	const cursorPaging = useCursorPaging(useUsersQuery, { limit }, offsetState);
	const { totalCount, pagination, query } = cursorPaging;

	if (!totalCount && query.fetchStatus !== "fetching") {
		return (
			<EmptyCard title="You have no users">
				Press
				<ButtonLink
					color="primary"
					to="/users/add"
					title="Add user"
					variant="bordered"
					className="mx-2"
					isIconOnly
				>
					<AddIcon size={24} />
				</ButtonLink>
				to add a user
			</EmptyCard>
		);
	}

	const paginationElement =
		!totalCount || (totalCount && totalCount <= limit) ? null : (
			<Pagination
				color="primary"
				size="lg"
				variant="bordered"
				className="self-center"
				{...pagination}
			/>
		);

	return (
		<>
			{paginationElement}
			<Overlay
				className="gap-2"
				overlay={
					query.fetchStatus === "fetching" ? <Spinner size="lg" /> : undefined
				}
			>
				{query.status === "error" ? <QueryErrorMessage query={query} /> : null}
				{query.status === "pending" ? (
					<Spinner size="lg" />
				) : query.data ? (
					<UserPreviews ids={query.data.items} />
				) : null}
			</Overlay>
			{paginationElement}
		</>
	);
};
