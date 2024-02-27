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

import { LoadableUser } from "~app/components/app/loadable-user";
import { useDebouncedValue } from "~app/hooks/use-debounced-value";
import type { TRPCQueryInput } from "~app/trpc";
import { trpc } from "~app/trpc";
import type { UsersId } from "~web/db/models";

const LIMIT = 5;

type Props = {
	selected?: UsersId | UsersId[];
	throttledMs?: number;
	onUserClick: (user: UsersId) => void;
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
	const selectedUserIds = Array.isArray(selected)
		? selected
		: selected
		? [selected]
		: [];
	const filterIds = [...(outerFilterIds || []), ...selectedUserIds];
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

	const topFetchedUserIds = React.useMemo(
		() => topQuery.data?.items ?? [],
		[topQuery.data],
	);
	const topFetchedUserQueries = trpc.useQueries((t) =>
		topFetchedUserIds.map((userId) => t.users.get({ id: userId })),
	);
	const filteredTopFetchedUserIds = React.useMemo(
		() =>
			topFetchedUserIds.filter((_userId, index) => {
				const topFetchedUserQuery = topFetchedUserQueries[index]!;
				if (topFetchedUserQuery.status !== "success" || !queryEnabled) {
					return true;
				}
				const user = topFetchedUserQuery.data;
				// Only show top users that match current input value
				return (
					user.name.toLowerCase().includes(value.toLowerCase()) ||
					user.publicName?.toLowerCase().includes(value.toLowerCase())
				);
			}),
		[queryEnabled, topFetchedUserIds, topFetchedUserQueries, value],
	);

	const fetchedUserIds = (
		query.data?.pages.reduce<UsersId[]>(
			(acc, page) => [...acc, ...page.items],
			[],
		) ?? []
	).filter(
		(userId) =>
			!filterIds.includes(userId) &&
			!filteredTopFetchedUserIds.includes(userId),
	);

	const onSelectionChange = React.useCallback(
		(key: string | number | null) => {
			if (key === null || typeof key === "number") {
				return;
			}
			const matchedUser =
				filteredTopFetchedUserIds.find((userId) => userId === key) ||
				fetchedUserIds.find((userId) => userId === key);
			if (matchedUser) {
				onUserClick(matchedUser);
			}
		},
		[filteredTopFetchedUserIds, fetchedUserIds, onUserClick],
	);

	const [, scrollerRef] = useInfiniteScroll({
		hasMore: query.hasNextPage,
		isEnabled: queryEnabled,
		shouldUseLoader: false,
		onLoadMore: query.fetchNextPage,
	});

	return (
		<View className="gap-4">
			{selectedUserIds.length === 0 ? null : (
				<View className="flex-row flex-wrap gap-4">
					{selectedUserIds.map((userId) => (
						<LoadableUser
							key={userId}
							id={userId}
							avatarProps={{ size: "sm" }}
						/>
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
				selectedKey={selectedUserIds[0] ?? null}
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
				{filteredTopFetchedUserIds.length === 0 ? (
					(null as unknown as CollectionElement<object>)
				) : (
					<AutocompleteSection
						showDivider={queryEnabled && fetchedUserIds.length !== 0}
						title="Recently used"
					>
						{filteredTopFetchedUserIds.map((userId) => (
							<AutocompleteItem key={userId} className="p-1" textValue={userId}>
								<LoadableUser id={userId} avatarProps={{ size: "sm" }} />
							</AutocompleteItem>
						))}
					</AutocompleteSection>
				)}
				{queryEnabled && fetchedUserIds.length !== 0 ? (
					<AutocompleteSection title="Lookup">
						{fetchedUserIds.map((userId) => (
							<AutocompleteItem key={userId} className="p-1" textValue={userId}>
								<LoadableUser id={userId} avatarProps={{ size: "sm" }} />
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
