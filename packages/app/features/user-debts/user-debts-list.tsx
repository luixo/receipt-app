import React from "react";
import { View } from "react-native";

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
import { EvenDebtsDivider } from "~app/features/user-debts/even-debts-divider";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import type { SearchParamState } from "~app/hooks/use-navigation";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import { useSubscribeToQueryUpdate } from "~app/hooks/use-subscribe-to-query";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryInput, TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import { typeQuery } from "~app/utils/queries";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { Text } from "~components/text";
import type { DebtId, UserId } from "~db/ids";
import { options as debtsRemoveOptions } from "~mutations/debts/remove";

import { UserDebtPreview, UserDebtPreviewSkeleton } from "./user-debt-preview";

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
		const consecutiveDebts: TRPCQueryOutput<"debts.get">[] = [];
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
		missingIds.forEach((missingId) => {
			// Debts are batched server-side so we can fetch all of them at once
			void queryClient.prefetchQuery(
				trpc.debts.get.queryOptions({ id: missingId }),
			);
		});
	}, [missingIds, queryClient, trpc]);
	return debts;
};

const useDividers = (debts: TRPCQueryOutput<"debts.get">[], userId: UserId) => {
	const trpc = useTRPC();
	const { data: aggregatedDebts = [] } = useQuery(
		trpc.debts.getAllUser.queryOptions({ userId }),
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
				const nextCurrencySum = prevCurrencySum + debt.amount;
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
					aggregatedDebts.map(({ currencyCode, sum }) => [currencyCode, -sum]),
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
	input: Omit<TRPCQueryInput<"debts.getByUserPaged">, "cursor">;
	limit: number;
	currentCursor: number;
}) => {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const queryFilters = trpc.debts.getByUserPaged.queryFilter(input);
	const getConsecutiveDebtIds = React.useCallback(() => {
		const cachedQueries = queryClient
			.getQueryCache()
			.findAll(queryFilters)
			.map((cachedQuery) => {
				const typedQuery = typeQuery(cachedQuery, "debts.getByUserPaged");
				return {
					input: typedQuery.queryKey[1].input,
					data: typedQuery.state.data,
				};
			});
		const getMatchedElement = (cursor: number) =>
			cachedQueries.find((cachedQuery) => cachedQuery.input.cursor === cursor);
		const consecutivePages: TRPCQueryOutput<"debts.getByUserPaged">[] = [];
		for (
			let lookupCursor = 0;
			lookupCursor <= currentCursor;
			lookupCursor += limit
		) {
			const matchedElement = getMatchedElement(lookupCursor);
			if (!matchedElement?.data) {
				return {
					debtIds: consecutivePages.flatMap((page) => page.items),
					missingCursors: new Array(Math.floor(currentCursor / limit))
						.fill(null)
						.map((_, page) =>
							getMatchedElement(page * limit) ? null : page * limit,
						)
						.filter(isNonNullish),
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
		{ key: "debts.getByUserPaged", filters: queryFilters },
		getConsecutiveDebtIds,
	);
	// Fetching all the missing lists to show even debts markers
	React.useEffect(() => {
		missingCursors.forEach((missingCursor) => {
			// Lists are batched server-side so we can fetch all of them at once
			void queryClient.prefetchQuery(
				trpc.debts.getByUserPaged.queryOptions({
					...input,
					cursor: missingCursor,
				}),
			);
		});
	}, [input, missingCursors, queryClient, trpc]);
	return debtIds;
};

const UserDebtsListWrapper: React.FC<React.PropsWithChildren> = ({
	children,
}) => <View>{children}</View>;

const UserDebtsPreviews: React.FC<{
	userId: UserId;
	debtIds: TRPCQueryOutput<"debts.getByUserPaged">["items"];
	consecutiveDebtIds: DebtId[];
	selectedDebtIds: DebtId[];
	setSelectedDebtIds: React.Dispatch<React.SetStateAction<DebtId[]>>;
}> = ({
	userId,
	debtIds,
	consecutiveDebtIds,
	selectedDebtIds,
	setSelectedDebtIds,
}) => {
	const consecutiveDebts = useDebtsByIds(consecutiveDebtIds);
	const { dividers, resolvedDebtIds } = useDividers(consecutiveDebts, userId);
	return (
		<UserDebtsListWrapper>
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
					<UserDebtPreview
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
		</UserDebtsListWrapper>
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
			// eslint-disable-next-line react-hooks/rules-of-hooks
			mutation: useMutation(
				trpc.debts.remove.mutationOptions(
					// eslint-disable-next-line react-hooks/rules-of-hooks
					useTrpcMutationOptions(debtsRemoveOptions, {
						context: cachedDebt ? { debt: cachedDebt } : skipToken,
					}),
				),
			),
		};
	});
	const onRemoveSelected = React.useCallback(() => {
		removeMutations.forEach(({ debtId, mutation }) => {
			if (!selectedDebtIds.includes(debtId)) {
				return;
			}
			mutation.mutate(
				{ id: debtId },
				{
					onSuccess: () =>
						setSelectedDebtIds((prevDebtIds) =>
							prevDebtIds.filter((lookupId) => lookupId !== debtId),
						),
				},
			);
		});
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

export const UserDebtsList = suspendedFallback<{
	userId: UserId;
	limitState: SearchParamState<"/debts/user/$id", "limit">;
	offsetState: SearchParamState<"/debts/user/$id", "offset">;
}>(
	({ userId, limitState: [limit, setLimit], offsetState }) => {
		const { t } = useTranslation("debts");
		const [showResolvedDebts, setShowResolvedDebts] = useShowResolvedDebts();
		const trpc = useTRPC();
		const currentInput = React.useMemo(
			() => ({
				limit,
				userId,
				filters: { showResolved: showResolvedDebts, ...filters },
			}),
			[limit, showResolvedDebts, userId],
		);
		const { data, onPageChange, isPending } = useCursorPaging(
			trpc.debts.getByUserPaged,
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
			return <Text className="text-center">{t("user.filters.empty")}</Text>;
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
					<UserDebtsPreviews
						userId={userId}
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
								{t("user.showResolved")}
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
				<UserDebtsListWrapper>
					{Array.from({ length: limitState[0] }).map((_, index) => (
						// eslint-disable-next-line react/no-array-index-key
						<React.Fragment key={index}>
							<Divider />
							<UserDebtPreviewSkeleton />
						</React.Fragment>
					))}
				</UserDebtsListWrapper>
			</SuspendedOverlay>
		</>
	),
);
