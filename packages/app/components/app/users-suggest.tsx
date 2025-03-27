import React from "react";
import { View } from "react-native";

import { useInfiniteScroll } from "@heroui/use-infinite-scroll";
import { keepPreviousData } from "@tanstack/react-query";
import { isNonNull } from "remeda";

import { LoadableUser } from "~app/components/app/loadable-user";
import { User } from "~app/components/app/user";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useDebouncedValue } from "~app/hooks/use-debounced-value";
import type { TRPCQueryInput } from "~app/trpc";
import { trpc } from "~app/trpc";
import {
	Autocomplete,
	AutocompleteItem,
	AutocompleteSection,
} from "~components/autocomplete";
import { Button } from "~components/button";
import { PlusIcon } from "~components/icons";
import type { UsersId } from "~db/models";

import { AddUserModal } from "./add-user-modal";

const LIMIT = 5;
const NEW_USER_KEY = "__NEW__";

type Props = {
	selected?: UsersId | UsersId[];
	throttledMs?: number;
	onUserClick: (user: UsersId) => void;
	limit?: number;
	topLimit?: number;
	filterIds?: UsersId[];
	additionalIds?: UsersId[];
	options?: TRPCQueryInput<"users.suggest">["options"];
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
	additionalIds,
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
				const topFetchedUserQuery = topFetchedUserQueries[index];
				if (!topFetchedUserQuery) {
					return false;
				}
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

	const [addUserOpen, { setFalse: closeAddUser, setTrue: openAddUser }] =
		useBooleanState();

	const onSelectionChange = React.useCallback(
		(key: string | number | null) => {
			if (key === null || typeof key === "number") {
				return;
			}
			if (key === NEW_USER_KEY) {
				openAddUser();
				return;
			}
			if (additionalIds?.includes(key)) {
				onUserClick(key);
				return;
			}
			const matchedUser =
				filteredTopFetchedUserIds.find((userId) => userId === key) ||
				fetchedUserIds.find((userId) => userId === key);
			if (matchedUser) {
				onUserClick(matchedUser);
			}
		},
		[
			additionalIds,
			filteredTopFetchedUserIds,
			fetchedUserIds,
			openAddUser,
			onUserClick,
		],
	);

	const [, scrollerRef] = useInfiniteScroll({
		hasMore: query.hasNextPage,
		isEnabled: queryEnabled,
		shouldUseLoader: false,
		onLoadMore: () => {
			void query.fetchNextPage();
		},
	});

	const sections = [
		additionalIds && additionalIds.length !== 0 ? (
			<AutocompleteSection key="self">
				{additionalIds.map((userId) => (
					<AutocompleteItem
						key={userId}
						className="p-1"
						textValue={userId}
						classNames={{ title: "flex" }}
					>
						<LoadableUser id={userId} avatarProps={{ size: "sm" }} />
					</AutocompleteItem>
				))}
			</AutocompleteSection>
		) : null,
		filteredTopFetchedUserIds.length === 0 ? null : (
			<AutocompleteSection title="Recently used" key="recent">
				{filteredTopFetchedUserIds.map((userId) => (
					<AutocompleteItem
						key={userId}
						className="p-1"
						textValue={userId}
						classNames={{ title: "flex" }}
					>
						<LoadableUser id={userId} avatarProps={{ size: "sm" }} />
					</AutocompleteItem>
				))}
			</AutocompleteSection>
		),
		queryEnabled && fetchedUserIds.length !== 0 ? (
			<AutocompleteSection title="Lookup" key="lookup">
				{fetchedUserIds.map((userId) => (
					<AutocompleteItem
						key={userId}
						className="p-1"
						textValue={userId}
						classNames={{ title: "flex" }}
					>
						<LoadableUser id={userId} avatarProps={{ size: "sm" }} />
					</AutocompleteItem>
				))}
			</AutocompleteSection>
		) : null,
		<AutocompleteSection key="new">
			<AutocompleteItem
				key={NEW_USER_KEY}
				className="p-1"
				textValue="Add new user"
				classNames={{ title: "flex" }}
			>
				<User
					id="new-user"
					name={value.length > 2 ? `Add user "${value}"` : "Add new user"}
					avatarProps={{
						fallback: null,
						getInitials: () => "+",
						size: "sm",
						classNames: { name: "text-2xl", base: "border" },
					}}
				/>
			</AutocompleteItem>
		</AutocompleteSection>,
	].filter(isNonNull);

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
					onPress: () => setValue(""),
				}}
				listboxProps={{
					classNames: { list: "m-0" },
					emptyContent: "No results found.",
				}}
				endContent={
					<Button
						isIconOnly
						variant="light"
						radius="full"
						size="sm"
						className={value ? undefined : "hidden"}
						onClick={openAddUser}
					>
						<PlusIcon size={24} />
					</Button>
				}
				{...props}
			>
				{sections}
			</Autocomplete>
			<AddUserModal
				isOpen={addUserOpen}
				onOpenChange={closeAddUser}
				initialValue={value}
				onSuccess={({ id }) => {
					onUserClick(id);
					setValue("");
					closeAddUser();
				}}
			/>
		</View>
	);
};
