import React from "react";

import { useInfiniteScroll } from "@heroui/use-infinite-scroll";
import {
	keepPreviousData,
	useInfiniteQuery,
	useQueries,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { isNonNull } from "remeda";

import { LoadableUser } from "~app/components/app/loadable-user";
import { User } from "~app/components/app/user";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useDebouncedValue } from "~app/hooks/use-debounced-value";
import type { TRPCQueryInput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import {
	Autocomplete,
	AutocompleteItem,
	AutocompleteSection,
} from "~components/autocomplete";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { SkeletonInput } from "~components/skeleton-input";
import { View } from "~components/view";
import type { UserId } from "~db/ids";

import { AddUserModal } from "./add-user-modal";

export const SkeletonUsersSuggest: React.FC<
	Partial<React.ComponentProps<typeof UsersSuggest>>
> = ({ wrapperProps }) => {
	const { t } = useTranslation("default");
	return (
		<View className="items-start gap-4" {...wrapperProps}>
			<SkeletonInput label={t("components.usersSuggest.label")} />
		</View>
	);
};

const LIMIT = 5;
const NEW_USER_KEY = "__NEW__";

type Props = {
	selected?: UserId | UserId[];
	multiselect?: boolean;
	throttledMs?: number;
	onUserClick: (user: UserId) => void;
	limit?: number;
	topLimit?: number;
	filterIds?: UserId[];
	additionalIds?: UserId[];
	options?: TRPCQueryInput<"users.suggest">["options"];
	closeOnSelect?: boolean;
	userProps?: Partial<React.ComponentProps<typeof LoadableUser>>;
	wrapperProps?: React.ComponentProps<typeof View>;
	setUserNameToInput?: boolean;
	selectedProps?: React.ComponentProps<typeof View>;
} & Omit<
	React.ComponentProps<typeof Autocomplete>,
	"items" | "defaultItems" | "children"
>;

export const UsersSuggest: React.FC<Props> = ({
	selected,
	multiselect,
	throttledMs = 300,
	limit = LIMIT,
	topLimit = LIMIT,
	options,
	filterIds: outerFilterIds,
	onUserClick: onUserClickOuter,
	additionalIds,
	userProps,
	wrapperProps,
	setUserNameToInput,
	selectedProps,
	...props
}) => {
	const { t } = useTranslation("default");
	const trpc = useTRPC();
	const [value, setValue] = React.useState("");
	const debouncedValue = useDebouncedValue(value, throttledMs);
	const queryEnabled = debouncedValue.length >= 1;
	const selectedUserIds = Array.isArray(selected)
		? selected
		: selected
			? [selected]
			: [];
	const initialUserIds = React.useRef(selectedUserIds);
	const filterIds = [...(outerFilterIds || []), ...selectedUserIds];
	const topQuery = useQuery(
		trpc.users.suggestTop.queryOptions(
			{ limit: topLimit, options, filterIds },
			{ placeholderData: keepPreviousData },
		),
	);
	const query = useInfiniteQuery(
		trpc.users.suggest.infiniteQueryOptions(
			{
				limit,
				input: debouncedValue,
				options,
				filterIds,
				direction: "forward",
				cursor: 0,
			},
			{
				getNextPageParam: (result, results) =>
					result.count > results.length * limit
						? result.cursor + limit
						: undefined,
				enabled: queryEnabled,
				placeholderData: keepPreviousData,
			},
		),
	);

	const topFetchedUserIds = React.useMemo(
		() => topQuery.data?.items ?? [],
		[topQuery.data],
	);
	const topFetchedUserQueries = useQueries({
		queries: topFetchedUserIds.map((userId) =>
			trpc.users.get.queryOptions({ id: userId }),
		),
	});
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
		query.data?.pages.reduce<UserId[]>(
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

	const queryClient = useQueryClient();
	const setUserNameById = React.useCallback(
		(id: UserId) => {
			const userData = queryClient.getQueryData(
				trpc.users.get.queryKey({ id }),
			);
			if (!userData) {
				return;
			}
			setValue(userData.name);
		},
		[queryClient, trpc.users.get],
	);
	React.useEffect(() => {
		const firstUser = initialUserIds.current[0];
		if (firstUser) {
			setUserNameById(firstUser);
		}
	}, [setUserNameById, initialUserIds]);
	const onUserClick = React.useCallback(
		(userId: UserId) => {
			onUserClickOuter(userId);
			if (setUserNameToInput) {
				setUserNameById(userId);
			}
		},
		[onUserClickOuter, setUserNameById, setUserNameToInput],
	);
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
			<AutocompleteSection
				title={t("components.usersSuggest.recentlyUsed")}
				key="recent"
			>
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
			<AutocompleteSection
				title={t("components.usersSuggest.lookup")}
				key="lookup"
			>
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
				textValue={t("components.usersSuggest.addUser.title")}
				classNames={{ title: "flex" }}
			>
				<User
					id="new-user"
					name={
						value.length > 2
							? t("components.usersSuggest.addUser.withName", { name: value })
							: t("components.usersSuggest.addUser.empty")
					}
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
		<View className="items-start gap-4" {...wrapperProps}>
			{selectedUserIds.length === 0 || multiselect ? (
				<Autocomplete
					// This is needed to reset the Autocomplete state on selected user change
					// Otherwise the dropdown will popup after user select
					key={selectedUserIds[0] ?? null}
					inputValue={value}
					onInputChange={setValue}
					label={t("components.usersSuggest.label")}
					labelPlacement="outside"
					placeholder={t("components.usersSuggest.placeholder")}
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
						emptyContent: t("components.usersSuggest.noResults"),
					}}
					endContent={
						<Button
							isIconOnly
							variant="light"
							radius="full"
							size="sm"
							className={value ? undefined : "hidden"}
							onPress={openAddUser}
						>
							<Icon name="plus" className="size-6" />
						</Button>
					}
					{...props}
				>
					{sections}
				</Autocomplete>
			) : (
				<View {...selectedProps}>
					{selectedUserIds.map((userId) => (
						<LoadableUser
							key={userId}
							id={userId}
							onClick={() => onUserClick(userId)}
							{...userProps}
						/>
					))}
				</View>
			)}
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
