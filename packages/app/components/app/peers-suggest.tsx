import React from "react";

import {
	keepPreviousData,
	useInfiniteQuery,
	useQueries,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { isNonNull } from "remeda";

import { LoadablePeer } from "~app/components/app/loadable-peer";
import { Peer } from "~app/components/app/peer";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useDebouncedValue } from "~app/hooks/use-debounced-value";
import type { TRPCQueryInput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { Autocomplete } from "~components/autocomplete";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { SkeletonInput } from "~components/skeleton-input";
import { Text } from "~components/text";
import { View } from "~components/view";
import type { PeerId } from "~db/ids";

import { AddPeerModal } from "./add-peer-modal";

export const SkeletonPeersSuggest: React.FC<
	Partial<React.ComponentProps<typeof PeersSuggest>>
> = ({ wrapperProps }) => {
	const { t } = useTranslation("default");
	return (
		<View className="items-start gap-4" {...wrapperProps}>
			<SkeletonInput label={t("components.peersSuggest.label")} />
		</View>
	);
};

const LIMIT = 5;
const NEW_USER_KEY = "__NEW__";

type Props = {
	selected?: PeerId | PeerId[];
	multiselect?: boolean;
	throttledMs?: number;
	onPeerClick: (peer: PeerId) => void;
	limit?: number;
	topLimit?: number;
	filterIds?: PeerId[];
	additionalIds?: PeerId[];
	options?: TRPCQueryInput<"peers.suggest">["options"];
	closeOnSelect?: boolean;
	peerProps?: Partial<React.ComponentProps<typeof LoadablePeer>>;
	wrapperProps?: React.ComponentProps<typeof View>;
	setPeerNameToInput?: boolean;
	selectedProps?: React.ComponentProps<typeof View>;
} & Partial<
	Omit<
		React.ComponentProps<typeof Autocomplete>,
		"items" | "defaultItems" | "children"
	>
>;

// It's hard to dismantle this components and keep it sane
// oxlint-disable-next-line complexity
export const PeersSuggest: React.FC<Props> = ({
	selected,
	multiselect,
	throttledMs = 300,
	limit = LIMIT,
	topLimit = LIMIT,
	options,
	filterIds: outerFilterIds,
	onPeerClick: onPeerClickOuter,
	additionalIds,
	peerProps,
	wrapperProps,
	setPeerNameToInput,
	selectedProps,
	...props
}) => {
	const { t } = useTranslation("default");
	const trpc = useTRPC();
	const [value, setValue] = React.useState("");
	const debouncedValue = useDebouncedValue(value, throttledMs);
	const queryEnabled = debouncedValue.length !== 0;
	const selectedPeerIds = Array.isArray(selected)
		? selected
		: selected
			? [selected]
			: [];
	const initialPeerIds = React.useRef(selectedPeerIds);
	const filterIds = [...(outerFilterIds || []), ...selectedPeerIds];
	const topQuery = useQuery(
		trpc.peers.suggestTop.queryOptions(
			{ limit: topLimit, options, filterIds },
			{ placeholderData: keepPreviousData },
		),
	);
	const { data, hasNextPage, isFetching, fetchNextPage } = useInfiniteQuery(
		trpc.peers.suggest.infiniteQueryOptions(
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

	const topFetchedPeerIds = React.useMemo(
		() => topQuery.data?.items ?? [],
		[topQuery.data],
	);
	const topFetchedPeerQueries = useQueries({
		queries: topFetchedPeerIds.map((peerId) =>
			trpc.peers.get.queryOptions({ id: peerId }),
		),
	});
	const filteredTopFetchedPeerIds = React.useMemo(
		() =>
			topFetchedPeerIds.filter((_peerId, index) => {
				const topFetchedPeerQuery = topFetchedPeerQueries[index];
				if (!topFetchedPeerQuery) {
					return false;
				}
				if (topFetchedPeerQuery.status !== "success" || !queryEnabled) {
					return true;
				}
				const peer = topFetchedPeerQuery.data;
				// Only show top peers that match current input value
				return (
					peer.name.toLowerCase().includes(value.toLowerCase()) ||
					peer.publicName?.toLowerCase().includes(value.toLowerCase())
				);
			}),
		[queryEnabled, topFetchedPeerIds, topFetchedPeerQueries, value],
	);

	const fetchedPeerIds = (
		data?.pages.reduce<PeerId[]>((acc, page) => [...acc, ...page.items], []) ??
		[]
	).filter(
		(peerId) =>
			!filterIds.includes(peerId) &&
			!filteredTopFetchedPeerIds.includes(peerId),
	);

	const [addPeerOpen, { setFalse: closeAddPeer, setTrue: openAddPeer }] =
		useBooleanState();

	const queryClient = useQueryClient();
	const setPeerNameById = React.useCallback(
		(id: PeerId) => {
			const peerData = queryClient.getQueryData(
				trpc.peers.get.queryKey({ id }),
			);
			if (!peerData) {
				return;
			}
			setValue(peerData.name);
		},
		[queryClient, trpc.peers.get],
	);
	React.useEffect(() => {
		const [firstPeer] = initialPeerIds.current;
		if (firstPeer) {
			setPeerNameById(firstPeer);
		}
	}, [setPeerNameById, initialPeerIds]);
	const onPeerClick = React.useCallback(
		(peerId: PeerId) => {
			onPeerClickOuter(peerId);
			if (setPeerNameToInput) {
				setPeerNameById(peerId);
			}
		},
		[onPeerClickOuter, setPeerNameById, setPeerNameToInput],
	);
	const onSelectionChange = React.useCallback(
		(key: string | number | null) => {
			if (key === null || typeof key === "number") {
				return;
			}
			if (key === NEW_USER_KEY) {
				openAddPeer();
				return;
			}
			if (additionalIds?.includes(key)) {
				onPeerClick(key);
				return;
			}
			const matchedPeer =
				filteredTopFetchedPeerIds.find((peerId) => peerId === key) ||
				fetchedPeerIds.find((peerId) => peerId === key);
			if (matchedPeer) {
				onPeerClick(matchedPeer);
			}
		},
		[
			additionalIds,
			filteredTopFetchedPeerIds,
			fetchedPeerIds,
			openAddPeer,
			onPeerClick,
		],
	);

	const sections: React.ComponentProps<typeof Autocomplete>["children"] = [
		additionalIds && additionalIds.length !== 0
			? {
					key: "self",
					items: additionalIds.map((peerId) => ({
						key: peerId,
						textValue: peerId,
						children: <LoadablePeer id={peerId} avatarProps={{ size: "sm" }} />,
					})),
				}
			: null,
		filteredTopFetchedPeerIds.length === 0
			? null
			: {
					title: t("components.peersSuggest.recentlyUsed"),
					key: "recent",
					items: filteredTopFetchedPeerIds.map((peerId) => ({
						key: peerId,
						textValue: peerId,
						children: <LoadablePeer id={peerId} avatarProps={{ size: "sm" }} />,
					})),
				},
		queryEnabled && fetchedPeerIds.length !== 0
			? {
					title: t("components.peersSuggest.lookup"),
					key: "lookup",
					items: fetchedPeerIds.map((peerId) => ({
						key: peerId,
						textValue: peerId,
						children: <LoadablePeer id={peerId} avatarProps={{ size: "sm" }} />,
					})),
				}
			: null,
		{
			key: "new",
			items: [
				{
					key: NEW_USER_KEY,
					textValue: t("components.peersSuggest.addPeer.title"),
					children: (
						<Peer
							id="new-peer"
							name={
								value.length > 2
									? t("components.peersSuggest.addPeer.withName", {
											name: value,
										})
									: t("components.peersSuggest.addPeer.empty")
							}
							avatarProps={{
								size: "sm",
								fallback: (
									<View className="bg-content3 border-default flex size-full items-center justify-center rounded-full border-2">
										<Text className="text-default-500 flex text-2xl">+</Text>
									</View>
								),
							}}
						/>
					),
				},
			],
		},
	].filter(isNonNull);

	return (
		<View
			testID="peers-suggest"
			className="items-start gap-4"
			{...wrapperProps}
		>
			{selectedPeerIds.length === 0 || multiselect ? (
				<Autocomplete
					// This is needed to reset the Autocomplete state on selected peer change
					// Otherwise the dropdown will popup after peer select
					key={selectedPeerIds[0] ?? null}
					inputValue={value}
					onInputChange={setValue}
					label={t("components.peersSuggest.label")}
					emptyContent={t("components.peersSuggest.noResults")}
					placeholder={t("components.peersSuggest.placeholder")}
					scroll={{
						hasMore: hasNextPage,
						isDisabled: !queryEnabled || isFetching,
						loadMore: () => {
							void fetchNextPage();
						},
					}}
					selectedKey={selectedPeerIds[0] ?? null}
					onSelectionChange={onSelectionChange}
					onClear={() => setValue("")}
					endContent={
						<Button
							isIconOnly
							variant="light"
							radius="full"
							size="sm"
							className={value ? undefined : "hidden"}
							onPress={openAddPeer}
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
					{selectedPeerIds.map((peerId) => (
						<LoadablePeer
							key={peerId}
							id={peerId}
							onPress={() => onPeerClick(peerId)}
							{...peerProps}
						/>
					))}
				</View>
			)}
			<AddPeerModal
				isOpen={addPeerOpen}
				onOpenChange={closeAddPeer}
				initialValue={value}
				onSuccess={({ id }) => {
					onPeerClick(id);
					setValue("");
					closeAddPeer();
				}}
			/>
		</View>
	);
};
