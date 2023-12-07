import React from "react";

import { Button, Link, Pagination, Spinner } from "@nextui-org/react-tailwind";
import { MdAdd as AddIcon } from "react-icons/md";

import { EmptyCard } from "app/components/empty-card";
import { QueryErrorMessage } from "app/components/error-message";
import { Overlay } from "app/components/overlay";
import { useCursorPaging } from "app/hooks/use-cursor-paging";
import { useTrpcQueryOptions } from "app/hooks/use-trpc-query-options";
import { queries } from "app/queries";
import type { TRPCQueryInput } from "app/trpc";
import { trpc } from "app/trpc";

import { UserPreview } from "./user-preview";

type Input = TRPCQueryInput<"users.getPaged">;

const useUsersQuery = (input: Omit<Input, "cursor">, cursor: Input["cursor"]) =>
	trpc.users.getPaged.useQuery(
		{ ...input, cursor },
		{
			...useTrpcQueryOptions(queries.users.getPaged.options),
			keepPreviousData: true,
		},
	);

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
				{query.status === "loading" ? (
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
