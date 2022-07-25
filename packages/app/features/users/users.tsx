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
import { IconButton } from "app/components/icon-button";
import { Overlay } from "app/components/overlay";
import { QueryErrorMessage } from "app/components/query-error-message";
import { useCursorPaging } from "app/hooks/use-cursor-paging";
import {
	trpc,
	TRPCInfiniteQuerySuccessResult,
	TRPCQueryOutput,
} from "app/trpc";

import { UserPreview } from "./user-preview";

const NoUsersHint = styled(Text, {
	display: "flex",
	alignItems: "center",
});

type UserPreviews = TRPCQueryOutput<"users.get-paged">["items"];

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

type InnerProps = {
	query: TRPCInfiniteQuerySuccessResult<"users.get-paged">;
};

const UsersInner: React.FC<InnerProps> = ({ query }) => {
	const usersGetPagedInput = cache.users.getPaged.useStore();
	const {
		onNextPage,
		onPrevPage,
		selectedPageIndex,
		selectedPage,
		prevSelectedPage,
		isLoading,
		prevDisabled,
		prevLoading,
		nextDisabled,
		nextLoading,
		totalCount,
	} = useCursorPaging(query);

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
						linkStyle={{ display: "inline-flex" }}
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
					{"<"}
				</Button>
				<Button>
					Page {selectedPageIndex + 1} of{" "}
					{totalCount
						? Math.ceil(totalCount / usersGetPagedInput.limit)
						: "unknown"}
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
				{selectedPage ? (
					<UserPreviewsList users={selectedPage.items} />
				) : prevSelectedPage ? (
					<UserPreviewsList users={prevSelectedPage.items} />
				) : null}
			</Overlay>
			<Spacer y={1} />
			{pagination}
		</>
	);
};

export const Users: React.FC = () => {
	const query = trpc.useInfiniteQuery(
		["users.get-paged", cache.users.getPaged.useStore()],
		{ getNextPageParam: cache.users.getPaged.getNextPage }
	);
	if (query.status === "loading") {
		return <Loading size="xl" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return <UsersInner query={query} />;
};
