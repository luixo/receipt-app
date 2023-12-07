import React from "react";

import { Container, Loading, Spacer } from "@nextui-org/react";
import { Button, Link, Pagination } from "@nextui-org/react-tailwind";
import { MdAdd as AddIcon } from "react-icons/md";

import { Text } from "app/components/base/text";
import { QueryErrorMessage } from "app/components/error-message";
import { Overlay } from "app/components/overlay";
import { useCursorPaging } from "app/hooks/use-cursor-paging";
import { useTrpcQueryOptions } from "app/hooks/use-trpc-query-options";
import { queries } from "app/queries";
import type { TRPCQueryInput, TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";

import { UserPreview } from "./user-preview";

type UserPreviews = TRPCQueryOutput<"users.getPaged">["items"];

type PreviewsProps = {
	users: UserPreviews;
};

const UserPreviewsList: React.FC<PreviewsProps> = ({ users }) => (
	<>
		{users.map((user, index) => (
			<React.Fragment key={user.id}>
				{index === 0 ? null : <Spacer y={0.5} />}
				<UserPreview data={user} />
			</React.Fragment>
		))}
	</>
);

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
			<Container
				display="flex"
				direction="column"
				alignItems="center"
				justify="center"
			>
				<Text className="text-4xl font-medium">You have no users</Text>
				<Text className="text-center text-2xl font-medium">
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
				</Text>
			</Container>
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
			<Spacer y={1} />
			<Overlay
				overlay={
					query.fetchStatus === "fetching" ? <Loading size="xl" /> : undefined
				}
			>
				{query.status === "error" ? <QueryErrorMessage query={query} /> : null}
				{query.status === "loading" ? (
					<Loading size="xl" />
				) : query.data ? (
					<UserPreviewsList users={query.data.items} />
				) : null}
			</Overlay>
			<Spacer y={1} />
			{paginationElement}
		</>
	);
};
