import React from "react";

import {
	skipToken,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fromEntries, isNonNullish, values } from "remeda";

import {
	PaginationBlock,
	PaginationBlockSkeleton,
} from "~app/components/pagination-block";
import { SuspendedOverlay } from "~app/components/pagination-overlay";
import { RemoveButton } from "~app/components/remove-button";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { EvenDebtsDivider } from "~app/features/peer-debts/even-debts-divider";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import { useSubscribeToQueryUpdate } from "~app/hooks/use-subscribe-to-query";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryInput } from "~app/trpc";
import type { Debt, DebtsByPeerPage } from "~app/trpc-types";
import type { CurrencyCode } from "~app/utils/currency";
import type {
	SearchParamState,
	SearchParamStateDefaulted,
} from "~app/utils/navigation";
import { typeQuery } from "~app/utils/queries";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { Text } from "~components/text";
import type { ViewReactNode } from "~components/view";
import { View } from "~components/view";
import type { DebtId, PeerId } from "~db/ids";
import { options as debtsRemoveOptions } from "~mutations/debts/remove";
import { round } from "~utils/math";

import { PeerDebtPreview, PeerDebtPreviewSkeleton } from "./peer-debt-preview";

const useDebtsByIds = (debtIds: DebtId[]) => {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const queryFilters = trpc.debts.get.queryFilter();
	const getConsecutiveDebtIds = React.useCallback(() => {
		const cachedQueries = queryClient
			.getQueryCache()
			.findAll(queryFilters)
			.map((cachedQuery) => {
				const typedQuery = typeQuery(cachedQuery, "debts.get");
				return {
					id: typedQuery.queryKey[1].input.id,
					data: typedQuery.state.data,
				};
			});
		const getMatchedDebt = (id: DebtId) =>
			cachedQueries.find((cachedQuery) => cachedQuery.id === id);
		const consecutiveDebts: Debt[] = [];
		for (const debtId of debtIds) {
			const matchedDebt = getMatchedDebt(debtId);
			if (!matchedDebt?.data) {
				return {
					debts: consecutiveDebts,
					missingIds: debtIds
						.map((id) => (getMatchedDebt(id) ? null : id))
						.filter(isNonNullish),
				};
			}
			consecutiveDebts.push(matchedDebt.data);
		}
		return { debts: consecutiveDebts, missingIds: [] };
	}, [debtIds, queryClient, queryFilters]);
	const { debts, missingIds } = useSubscribeToQueryUpdate(
		{ key: "debts.get", filters: queryFilters },
		getConsecutiveDebtIds,
	);
	// Fetching all the missing debts to show even debts markers
	React.useEffect(() => {
		for (const missingId of missingIds) {
			// Debts are batched server-side so we can fetch all of them at once
			void queryClient.prefetchQuery(
				trpc.debts.get.queryOptions({ id: missingId }),
			);
		}
	}, [missingIds, queryClient, trpc]);
	return debts;
};

const useDividers = (debts: Debt[], peerId: PeerId) => {
	const trpc = useTRPC();
	const { data: aggregatedDebts = { items: [] } } = useQuery(
		trpc.debts.getAllPeer.queryOptions({ peerId }),
	);
	return React.useMemo(() => {
		const dividersCalculations = debts.reduce<{
			sums: Partial<Record<CurrencyCode, number>>;
			resolvedCurrencies: CurrencyCode[];
			resolvedDebtIds: DebtId[];
			dividers: Record<DebtId, CurrencyCode>;
		}>(
			(acc, debt) => {
				const prevCurrencySum = acc.sums[debt.currencyCode] ?? 0;
				const nextCurrencySum = round(prevCurrencySum + debt.amount);
				const nextResolvedCurrencies =
					prevCurrencySum === 0
						? [...acc.resolvedCurrencies, debt.currencyCode]
						: acc.resolvedCurrencies;
				return {
					sums: { ...acc.sums, [debt.currencyCode]: nextCurrencySum },
					resolvedCurrencies: nextResolvedCurrencies,
					dividers:
						prevCurrencySum === 0
							? { ...acc.dividers, [debt.id]: debt.currencyCode }
							: acc.dividers,
					resolvedDebtIds: nextResolvedCurrencies.includes(debt.currencyCode)
						? [...acc.resolvedDebtIds, debt.id]
						: acc.resolvedDebtIds,
				};
			},
			{
				sums: fromEntries(
					aggregatedDebts.items.map(({ currencyCode, sum }) => [
						currencyCode,
						-sum,
					]),
				),
				resolvedDebtIds: [],
				resolvedCurrencies: [],
				dividers: {},
			},
		);
		return {
			dividers: dividersCalculations.dividers,
			resolvedDebtIds: dividersCalculations.resolvedDebtIds,
		};
	}, [aggregatedDebts, debts]);
};

const useConsecutiveDebtIds = ({
	input,
	limit,
	currentCursor,
}: {
	input: Omit<TRPCQueryInput<"debts.getByPeerPaged">, "cursor">;
	limit: number;
	currentCursor: number;
}) => {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const queryFilters = trpc.debts.getByPeerPaged.queryFilter(input);
	const getConsecutiveDebtIds = React.useCallback(() => {
		const cachedQueries = queryClient
			.getQueryCache()
			.findAll(queryFilters)
			.map((cachedQuery) => {
				const typedQuery = typeQuery(cachedQuery, "debts.getByPeerPaged");
				return {
					input: typedQuery.queryKey[1].input,
					data: typedQuery.state.data,
				};
			});
		const getMatchedElement = (cursor: number) =>
			cachedQueries.find((cachedQuery) => cachedQuery.input.cursor === cursor);
		const consecutivePages: DebtsByPeerPage[] = [];
		for (
			let lookupCursor = 0;
			lookupCursor <= currentCursor;
			lookupCursor += limit
		) {
			const matchedElement = getMatchedElement(lookupCursor);
			if (!matchedElement?.data) {
				return {
					debtIds: consecutivePages.flatMap((page) => page.items),
					missingCursors: Array.from(
						{ length: Math.floor(currentCursor / limit) },
						(_, page) =>
							getMatchedElement(page * limit) ? null : page * limit,
					).filter(isNonNullish),
				};
			}
			consecutivePages.push(matchedElement.data);
		}
		return {
			debtIds: consecutivePages.flatMap((page) => page.items),
			missingCursors: [],
		};
	}, [limit, currentCursor, queryClient, queryFilters]);
	const { debtIds, missingCursors } = useSubscribeToQueryUpdate(
		{ key: "debts.getByPeerPaged", filters: queryFilters },
		getConsecutiveDebtIds,
	);
	// Fetching all the missing lists to show even debts markers
	React.useEffect(() => {
		for (const missingCursor of missingCursors) {
			// Lists are batched server-side so we can fetch all of them at once
			void queryClient.prefetchQuery(
				trpc.debts.getByPeerPaged.queryOptions({
					...input,
					cursor: missingCursor,
				}),
			);
		}
	}, [input, missingCursors, queryClient, trpc]);
	return debtIds;
};

const PeerDebtsListWrapper: React.FC<{ children: ViewReactNode }> = ({
	children,
}) => <View>{children}</View>;

const PeerDebtsPreviews: React.FC<{
	peerId: PeerId;
	debtIds: DebtsByPeerPage["items"];
	consecutiveDebtIds: DebtId[];
	selectedDebtIds: DebtId[];
	setSelectedDebtIds: React.Dispatch<React.SetStateAction<DebtId[]>>;
}> = ({
	peerId,
	debtIds,
	consecutiveDebtIds,
	selectedDebtIds,
	setSelectedDebtIds,
}) => {
	const consecutiveDebts = useDebtsByIds(consecutiveDebtIds);
	const { dividers, resolvedDebtIds } = useDividers(consecutiveDebts, peerId);
	return (
		<PeerDebtsListWrapper>
			{debtIds.map((debtId, index) => (
				<React.Fragment key={debtId}>
					{dividers[debtId] ? (
						<>
							<Divider />
							<EvenDebtsDivider
								className="py-2"
								currencyCode={dividers[debtId]}
							/>
						</>
					) : null}
					{index === 0 ? null : <Divider />}
					<PeerDebtPreview
						debtId={debtId}
						resolved={resolvedDebtIds.includes(debtId)}
						isSelected={selectedDebtIds.includes(debtId)}
						onValueChange={(nextSelected) =>
							setSelectedDebtIds((prevSelected) =>
								nextSelected
									? [...prevSelected, debtId]
									: prevSelected.filter(
											(lookupValue) => lookupValue !== debtId,
										),
							)
						}
					/>
				</React.Fragment>
			))}
		</PeerDebtsListWrapper>
	);
};

const RemoveDebtsButton: React.FC<{
	debtIds: DebtId[];
	selectedDebtIds: DebtId[];
	setSelectedDebtIds: React.Dispatch<React.SetStateAction<DebtId[]>>;
}> = ({ selectedDebtIds, setSelectedDebtIds, debtIds }) => {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const removeMutations = debtIds.map((debtId) => {
		const cachedDebt = queryClient.getQueryData(
			trpc.debts.get.queryOptions({ id: debtId }).queryKey,
		);
		return {
			debtId,
			// Mutations are stable due to `key` based on limit in the parent component
			// oxlint-disable-next-line react-hooks/rules-of-hooks
			mutation: useMutation(
				trpc.debts.remove.mutationOptions(
					// oxlint-disable-next-line react-hooks/rules-of-hooks
					useTrpcMutationOptions(debtsRemoveOptions, {
						context: cachedDebt ? { debt: cachedDebt } : skipToken,
					}),
				),
			),
		};
	});
	const onRemoveSelected = React.useCallback(() => {
		for (const { debtId, mutation } of removeMutations) {
			if (selectedDebtIds.includes(debtId)) {
				mutation.mutate(
					{ id: debtId },
					{
						onSuccess: () =>
							setSelectedDebtIds((prevDebtIds) =>
								prevDebtIds.filter((lookupId) => lookupId !== debtId),
							),
					},
				);
			}
		}
	}, [removeMutations, selectedDebtIds, setSelectedDebtIds]);
	return (
		<RemoveButton
			onRemove={onRemoveSelected}
			mutation={{
				isPending: removeMutations.some(({ mutation }) => mutation.isPending),
			}}
			isIconOnly
			noConfirm={selectedDebtIds.length < 2}
			isDisabled={selectedDebtIds.length === 0}
		/>
	);
};

const filters = {};

export const PeerDebtsList = suspendedFallback<{
	peerId: PeerId;
	limitState: SearchParamStateDefaulted<"/_protected/debts/peer/$id/", "limit">;
	offsetState: SearchParamState<"/_protected/debts/peer/$id/", "offset">;
}>(
	({ peerId, limitState: [limit, setLimit], offsetState }) => {
		const { t } = useTranslation("debts");
		const [showResolvedDebts, setShowResolvedDebts] = useShowResolvedDebts();
		const trpc = useTRPC();
		const currentInput = React.useMemo(
			() => ({
				limit,
				peerId,
				filters: { showResolved: showResolvedDebts, ...filters },
			}),
			[limit, showResolvedDebts, peerId],
		);
		const { data, onPageChange, isPending } = useCursorPaging(
			trpc.debts.getByPeerPaged,
			currentInput,
			offsetState,
		);
		const consecutiveDebtIds = useConsecutiveDebtIds({
			input: currentInput,
			limit,
			currentCursor: offsetState[0],
		});
		const [selectedDebtIds, setSelectedDebtIds] = React.useState<DebtId[]>([]);

		if (data.count === 0 && values(filters).filter(isNonNullish).length === 0) {
			return <Text className="text-center">{t("peer.filters.empty")}</Text>;
		}

		return (
			<>
				<PaginationBlock
					totalCount={data.count}
					limit={limit}
					setLimit={setLimit}
					offset={offsetState[0]}
					onPageChange={onPageChange}
					selection={{
						items: data.items,
						selectedItems: selectedDebtIds,
						setSelectedItems: setSelectedDebtIds,
					}}
					endContent={
						<RemoveDebtsButton
							key={data.items.length}
							selectedDebtIds={selectedDebtIds}
							setSelectedDebtIds={setSelectedDebtIds}
							debtIds={data.items}
						/>
					}
				/>
				<SuspendedOverlay isPending={isPending}>
					<PeerDebtsPreviews
						peerId={peerId}
						debtIds={data.items}
						consecutiveDebtIds={consecutiveDebtIds}
						selectedDebtIds={selectedDebtIds}
						setSelectedDebtIds={setSelectedDebtIds}
					/>
					{showResolvedDebts || offsetState[0] + limit < data.count ? null : (
						<View className="flex items-center">
							<Button
								variant="bordered"
								color="primary"
								onPress={() => setShowResolvedDebts(true)}
							>
								{t("peer.showResolved")}
							</Button>
						</View>
					)}
				</SuspendedOverlay>
			</>
		);
	},
	({ limitState }) => (
		<>
			<PaginationBlockSkeleton limit={limitState[0]} />
			<SuspendedOverlay isPending>
				<PeerDebtsListWrapper>
					{Array.from({ length: limitState[0] }).map((_, index) => (
						// oxlint-disable-next-line react/no-array-index-key
						<React.Fragment key={index}>
							<Divider />
							<PeerDebtPreviewSkeleton />
						</React.Fragment>
					))}
				</PeerDebtsListWrapper>
			</SuspendedOverlay>
		</>
	),
);
