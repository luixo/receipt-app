import React from "react";
import { View } from "react-native";

import {
	Autocomplete,
	AutocompleteItem,
	AutocompleteSection,
} from "@nextui-org/react";
import { useInfiniteScroll } from "@nextui-org/use-infinite-scroll";
import type { CollectionElement } from "@react-types/shared";
import { keepPreviousData } from "@tanstack/react-query";

import { User } from "app/components/app/user";
import { useDebouncedValue } from "app/hooks/use-debounced-value";
import type { TRPCQueryInput, TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import type { UsersId } from "next-app/db/models";

type UsersResponse = TRPCQueryOutput<"users.suggest">;
type UserItem = UsersResponse["items"][number];

const LIMIT = 5;

type Props = {
	selected?: UserItem | UserItem[];
	throttledMs?: number;
	onUserClick: (user: UserItem) => void;
	limit?: number;
	topLimit?: number;
	filterIds?: UsersId[];
	options: TRPCQueryInput<"users.suggest">["options"];
	closeOnSelect?: boolean;
} & Omit<
	React.ComponentProps<typeof Autocomplete>,
	"items" | "defaultItems" | "children"
>;

export const UsersSuggest: React.FC<Props> = ({
	selected,
	throttledMs = 300,
	limit = LIMIT,
	topLimit = LIMIT,
	options,
	filterIds: outerFilterIds,
	onUserClick,
	closeOnSelect,
	...props
}) => {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [value, setValue] = React.useState("");
	const debouncedValue = useDebouncedValue(value, throttledMs);
	const queryEnabled = debouncedValue.length >= 1;
	const selectedUsers = Array.isArray(selected)
		? selected
		: selected
		? [selected]
		: [];
	const filterIds = [
		...(outerFilterIds || []),
		...selectedUsers.map((user) => user.id),
	];
	const topQuery = trpc.users.suggestTop.useQuery(
		{ limit: topLimit, options, filterIds },
		{ placeholderData: keepPreviousData },
	);
	const query = trpc.users.suggest.useInfiniteQuery(
		{ limit, input: debouncedValue, options, filterIds },
		{
			getNextPageParam: (result) =>
				result.hasMore ? result.cursor + limit : undefined,
			enabled: queryEnabled,
			placeholderData: keepPreviousData,
		},
	);

	const topFetchedUsers = (topQuery.data?.items ?? [])
		.filter((user) => !filterIds.includes(user.id))
		.filter(
			queryEnabled
				? (user) =>
						user.name.toLowerCase().includes(value.toLowerCase()) ||
						user.publicName?.toLowerCase().includes(value.toLowerCase())
				: () => true,
		);
	const topFetchedUsersIds = topFetchedUsers.map(({ id }) => id);

	const fetchedUsers = (
		query.data?.pages.reduce<UserItem[]>(
			(acc, page) => [...acc, ...page.items],
			[],
		) ?? []
	).filter(
		(user) =>
			!filterIds.includes(user.id) && !topFetchedUsersIds.includes(user.id),
	);

	const onSelectionChange = React.useCallback(
		(key: string | number | null) => {
			if (key === null || typeof key === "number") {
				return;
			}
			const matchedUser =
				topFetchedUsers.find((user) => user.id === key) ||
				fetchedUsers.find((user) => user.id === key);
			if (matchedUser) {
				onUserClick(matchedUser);
			}
		},
		[topFetchedUsers, fetchedUsers, onUserClick],
	);

	const [, scrollerRef] = useInfiniteScroll({
		hasMore: query.hasNextPage,
		isEnabled: queryEnabled,
		shouldUseLoader: false,
		onLoadMore: query.fetchNextPage,
	});

	return (
		<View className="gap-4">
			{selectedUsers.length === 0 ? null : (
				<View className="flex-row flex-wrap gap-4">
					{selectedUsers.map((user) => (
						<User key={user.id} user={user} avatarProps={{ size: "sm" }} />
					))}
				</View>
			)}
			<Autocomplete
				ref={inputRef}
				inputValue={value}
				onInputChange={setValue}
				isLoading={topQuery.status === "pending"}
				label="Select a user"
				labelPlacement="outside"
				placeholder="Start typing"
				variant="bordered"
				scrollRef={scrollerRef}
				items={[]}
				selectedKey={selectedUsers[0]?.id ?? null}
				onSelectionChange={onSelectionChange}
				clearButtonProps={{
					onClick: () => setValue(""),
				}}
				listboxProps={{
					classNames: { list: "m-0" },
					emptyContent: "No results found.",
				}}
				{...props}
			>
				{topFetchedUsers.length === 0 ? (
					(null as unknown as CollectionElement<object>)
				) : (
					<AutocompleteSection
						showDivider={queryEnabled && fetchedUsers.length !== 0}
						title="Recently used"
					>
						{topFetchedUsers.map((user) => (
							<AutocompleteItem
								key={user.id}
								className="p-1"
								textValue={user.name}
							>
								<User user={user} avatarProps={{ size: "sm" }} />
							</AutocompleteItem>
						))}
					</AutocompleteSection>
				)}
				{queryEnabled && fetchedUsers.length !== 0 ? (
					<AutocompleteSection title="Lookup">
						{fetchedUsers.map((user) => (
							<AutocompleteItem
								key={user.id}
								className="p-1"
								textValue={user.name}
							>
								<User user={user} avatarProps={{ size: "sm" }} />
							</AutocompleteItem>
						))}
					</AutocompleteSection>
				) : (
					(null as unknown as CollectionElement<object>)
				)}
			</Autocomplete>
		</View>
	);
};
