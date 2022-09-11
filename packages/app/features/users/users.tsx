import React from "react";

import { Container, Loading, Spacer, Text, styled } from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { cache } from "app/cache";
import { QueryErrorMessage } from "app/components/error-message";
import { IconButton } from "app/components/icon-button";
import { Overlay } from "app/components/overlay";
import { Pagination } from "app/components/pagination";
import { useCursorPaging } from "app/hooks/use-cursor-paging";
import { trpc, TRPCQueryInput, TRPCQueryOutput } from "app/trpc";

import { UserPreview } from "./user-preview";

const NoUsersHint = styled(Text, {
	display: "flex",
	alignItems: "center",
});

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
		{ keepPreviousData: true }
	);

export const Users: React.FC = () => {
	const [input] = cache.users.getPaged.useStore();
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
				<Text h2>You have no users</Text>
				<Spacer y={0.5} />
				<NoUsersHint h3>
					Press
					<Spacer x={0.5} />
					<IconButton
						href="/users/add"
						title="Add user"
						bordered
						icon={<AddIcon size={24} />}
					/>{" "}
					<Spacer x={0.5} />
					to add a user
				</NoUsersHint>
			</Container>
		);
	}

	const paginationElement = (
		<Container display="flex" justify="center">
			<Pagination {...pagination} />
		</Container>
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
