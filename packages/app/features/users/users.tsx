import React from "react";

import { Button, Link, Pagination, Spinner } from "@nextui-org/react";
import { keepPreviousData } from "@tanstack/react-query";
import { MdAdd as AddIcon } from "react-icons/md";

import { EmptyCard } from "app/components/empty-card";
import { QueryErrorMessage } from "app/components/error-message";
import { Overlay } from "app/components/overlay";
import { useCursorPaging } from "app/hooks/use-cursor-paging";
import { queries } from "app/queries";
import type { TRPCQueryInput } from "app/trpc";
import { trpc } from "app/trpc";

import { UserPreview } from "./user-preview";

type Input = TRPCQueryInput<"users.getPaged">;

const useUsersQuery = (
	input: Omit<Input, "cursor">,
	cursor: Input["cursor"],
) => {
	const query = trpc.users.getPaged.useQuery(
		{ ...input, cursor },
		{ placeholderData: keepPreviousData },
	);
	const utils = trpc.useUtils();
	React.useEffect(() => {
		if (query.status !== "success") {
			return;
		}
		query.data.items.forEach((user) => {
			if (!utils.users.getName.getData({ id: user.id })) {
				utils.users.getName.setData({ id: user.id }, () => user.name);
			}
		});
	}, [query, utils]);
	return query;
};

export const Users: React.FC = () => {
	const [input] = queries.users.getPaged.useStore();
	const cursorPaging = useCursorPaging(useUsersQuery, input, "offset");
	const { totalCount, pagination, query } = cursorPaging;

	if (!totalCount && query.fetchStatus !== "fetching") {
		return (
			<EmptyCard title="You have no users">
				Press
				<Button
					color="primary"
					href="/users/add"
					as={Link}
					title="Add user"
					variant="bordered"
					className="mx-2"
					isIconOnly
				>
					<AddIcon size={24} />
				</Button>
				to add a user
			</EmptyCard>
		);
	}

	const paginationElement = (
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
					query.data.items.map((user) => (
						<UserPreview key={user.id} data={user} />
					))
				) : null}
			</Overlay>
			{paginationElement}
		</>
	);
};
