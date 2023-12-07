import React from "react";
import { View } from "react-native";

import {
	Button,
	Link,
	Pagination,
	Spacer,
	Spinner,
} from "@nextui-org/react-tailwind";
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
				{index === 0 ? null : <Spacer y={2} />}
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
			<View className="m-10 self-center md:max-w-lg">
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
			</View>
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
			<Spacer y={4} />
			<Overlay
				overlay={
					query.fetchStatus === "fetching" ? <Spinner size="lg" /> : undefined
				}
			>
				{query.status === "error" ? <QueryErrorMessage query={query} /> : null}
				{query.status === "loading" ? (
					<Spinner size="lg" />
				) : query.data ? (
					<UserPreviewsList users={query.data.items} />
				) : null}
			</Overlay>
			<Spacer y={4} />
			{paginationElement}
		</>
	);
};
