import React from "react";

import {
	Container,
	Loading,
	Spacer,
	Text,
	Button,
	styled,
} from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { cache } from "app/cache";
import { QueryErrorMessage } from "app/components/error-message";
import { IconButton } from "app/components/icon-button";
import { Overlay } from "app/components/overlay";
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
	const {
		onNextPage,
		onPrevPage,
		selectedPageIndex,
		query,
		isLoading,
		prevDisabled,
		prevLoading,
		nextDisabled,
		nextLoading,
		totalCount,
	} = cursorPaging;

	if (totalCount === 0) {
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

	const pagination = (
		<Container display="flex" justify="center">
			<Button.Group size="sm">
				<Button
					onClick={prevLoading ? undefined : onPrevPage}
					disabled={prevDisabled}
				>
					{prevLoading ? <Loading color="currentColor" size="xs" /> : "<"}
				</Button>
				<Button>
					{selectedPageIndex + 1} of{" "}
					{totalCount ? Math.ceil(totalCount / input.limit) : "?"}
				</Button>
				<Button
					onClick={nextLoading ? undefined : onNextPage}
					disabled={nextDisabled}
				>
					{nextLoading ? <Loading color="currentColor" size="xs" /> : ">"}
				</Button>
			</Button.Group>
		</Container>
	);

	return (
		<>
			{pagination}
			<Spacer y={1} />
			<Overlay overlay={isLoading ? <Loading size="xl" /> : undefined}>
				{query.status === "error" ? <QueryErrorMessage query={query} /> : null}
				{query.status === "loading" ? (
					<Loading size="xl" />
				) : query.data ? (
					<UserPreviewsList users={query.data.items} />
				) : null}
			</Overlay>
			<Spacer y={1} />
			{pagination}
		</>
	);
};
