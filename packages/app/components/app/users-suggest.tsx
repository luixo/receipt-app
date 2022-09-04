import React from "react";

import {
	Button,
	FormElement,
	Input,
	Loading,
	Popover,
	Text,
	Badge,
	styled,
	NormalColors,
	Card,
} from "@nextui-org/react";

import { QueryErrorMessage } from "app/components/error-message";
import { useBooleanState } from "app/hooks/use-boolean-state";
import { useDebouncedValue } from "app/hooks/use-debounced-value";
import { useWindowSizeChange } from "app/hooks/use-window-size-change";
import {
	trpc,
	TRPCQueryOutput,
	TRPCInfiniteQueryResult,
	TRPCQueryInput,
	TRPCQueryResult,
} from "app/trpc";
import { UsersId } from "next-app/db/models";

type UsersResponse = TRPCQueryOutput<"users.suggest">;
type User = UsersResponse["items"][number];

const Wrapper = styled("div", {
	display: "flex",
	flexDirection: "column",
	alignItems: "stretch",
	justifyContent: "center",
});

const Badges = styled("div", {
	display: "flex",
	flexWrap: "wrap",
	gap: "$4",
	mb: "$6",
});

const Buttons = styled("div", {
	display: "flex",
	flexWrap: "wrap",
	gap: "$4",
});

const UserButton = styled(Button, {
	// Overriding size="small" prop styles
	minWidth: "initial !important",
});

type DropdownProps = {
	query: TRPCInfiniteQueryResult<"users.suggest">;
	queryEnabled: boolean;
	filterIds: UsersId[];
	onUserClick: (user: User) => void;
};

const UsersSuggestDropdown: React.FC<DropdownProps> = ({
	query,
	queryEnabled,
	filterIds,
	onUserClick,
}) => {
	const loadMore = React.useCallback(() => query.fetchNextPage(), [query]);
	if (!queryEnabled) {
		return <Text>Please type 3 or more chars</Text>;
	}
	if (query.status === "loading") {
		return <Loading size="xs" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return <Loading size="xs" />;
	}
	const users = query.data.pages.reduce<User[]>(
		(acc, page) => [...acc, ...page.items],
		[]
	);
	if (users.length === 0) {
		return (
			<Buttons>
				{query.isRefetching ? (
					<Loading size="xs" />
				) : (
					<Text>No users found</Text>
				)}
			</Buttons>
		);
	}
	return (
		<Buttons>
			{users
				.filter((user) => !filterIds.includes(user.id))
				.map((user) => (
					<UserButton
						key={user.id}
						onClick={() => onUserClick(user)}
						flat
						color={"neutral" as NormalColors}
						size="sm"
					>
						{user.name}
					</UserButton>
				))}
			{query.status === "success" && query.hasNextPage ? (
				<UserButton onClick={loadMore} flat size="sm">
					Load more
				</UserButton>
			) : null}
			{query.isRefetching ? <Loading size="xs" /> : null}
		</Buttons>
	);
};

type TopDropdownProps = {
	query: TRPCQueryResult<"users.suggest-top">;
	filterIds: UsersId[];
	onUserClick: (user: User) => void;
};

const UsersSuggestTopDropdown: React.FC<TopDropdownProps> = ({
	query,
	filterIds,
	onUserClick,
}) => {
	if (query.status === "loading") {
		return <Loading size="xs" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return <Loading size="xs" />;
	}
	const users = query.data.items;
	if (users.length === 0) {
		return null;
	}
	return (
		<Buttons>
			{users
				.filter((user) => !filterIds.includes(user.id))
				.map((user) => (
					<UserButton
						key={user.id}
						onClick={() => onUserClick(user)}
						flat
						color={"neutral" as NormalColors}
						size="sm"
					>
						{user.name}
					</UserButton>
				))}
		</Buttons>
	);
};

const LIMIT = 5;

type Props = {
	selected?: User | User[];
	disabled?: boolean;
	throttledMs?: number;
	onUserClick: (user: User) => void;
	limit?: number;
	topLimit?: number;
	filterIds?: UsersId[];
	options: TRPCQueryInput<"users.suggest">["options"];
} & React.ComponentProps<typeof Input>;

export const UsersSuggest: React.FC<Props> = ({
	selected,
	disabled,
	throttledMs = 300,
	limit = LIMIT,
	topLimit = LIMIT,
	options,
	filterIds: outerFilterIds,
	onUserClick,
	...props
}) => {
	const [dropdownVisible, { setFalse: hideDropdown, setTrue: showDropdown }] =
		useBooleanState(false);
	const [value, setValue] = React.useState("");
	const debouncedValue = useDebouncedValue(value, throttledMs);
	const onChange = React.useCallback(
		(e: React.ChangeEvent<FormElement>) => setValue(e.currentTarget.value),
		[setValue]
	);
	const queryEnabled = debouncedValue.length >= 3;
	const selectedUsers = Array.isArray(selected)
		? selected
		: selected
		? [selected]
		: [];
	const filterIds = [
		...(outerFilterIds || []),
		...selectedUsers.map((user) => user.id),
	];
	const topQuery = trpc.useQuery(
		["users.suggest-top", { limit: topLimit, options, filterIds }],
		{ keepPreviousData: true }
	);
	const query = trpc.useInfiniteQuery(
		["users.suggest", { limit, input: debouncedValue, options, filterIds }],
		{
			getNextPageParam: (result) =>
				result.hasMore ? result.cursor + limit : undefined,
			enabled: queryEnabled,
			keepPreviousData: true,
		}
	);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const focusInput = React.useCallback(
		() => inputRef.current?.focus(),
		[inputRef]
	);
	React.useEffect(() => {
		if (dropdownVisible) {
			const timeoutId = window.setTimeout(focusInput, 250);
			return () => window.clearTimeout(timeoutId);
		}
	}, [dropdownVisible, focusInput]);
	const [inputWidth, setInputWidth] = React.useState<number | undefined>();
	useWindowSizeChange(() => {
		const inputElement = inputRef.current;
		if (!inputElement) {
			return;
		}
		setInputWidth(inputElement.offsetWidth);
	}, [setInputWidth]);
	const shouldCloseOnInteractOutside = React.useCallback(
		(e: HTMLElement) => {
			const inputElement = inputRef.current;
			return inputElement ? !inputElement.contains(e) : true;
		},
		[inputRef]
	);
	return (
		<Wrapper>
			{selectedUsers.length !== 0 ? (
				<Badges>
					{selectedUsers.map((user) => (
						<Badge key={user.id}>{user.name}</Badge>
					))}
				</Badges>
			) : null}
			<Input
				value={value}
				onChange={onChange}
				onClick={showDropdown}
				disabled={disabled}
				label="User"
				placeholder="Start typing"
				ref={inputRef}
				{...props}
			/>
			<Popover
				placement="bottom-left"
				isOpen={dropdownVisible}
				onClose={hideDropdown}
				triggerRef={inputRef}
				shouldCloseOnInteractOutside={shouldCloseOnInteractOutside}
			>
				<div />
				<Popover.Content
					css={{
						background: "$accents2",
						p: "$6",
						maxWidth: inputWidth,
						borderStyle: "solid",
						borderColor: "$accents5",
						shadow: "$md",
					}}
				>
					{topQuery.status === "success" &&
					topQuery.data.items.length === 0 ? null : (
						<>
							<UsersSuggestTopDropdown
								query={topQuery}
								onUserClick={onUserClick}
								filterIds={filterIds}
							/>
							<Card.Divider y={1} />
						</>
					)}
					<UsersSuggestDropdown
						query={query}
						queryEnabled={queryEnabled}
						onUserClick={onUserClick}
						filterIds={filterIds}
					/>
				</Popover.Content>
			</Popover>
		</Wrapper>
	);
};
