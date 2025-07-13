import React from "react";
import { View } from "react-native";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fromEntries, isNonNullish, values } from "remeda";

import {
	PaginationBlock,
	PaginationBlockSkeleton,
} from "~app/components/pagination-block";
import { PaginationOverlay } from "~app/components/pagination-overlay";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { EvenDebtsDivider } from "~app/features/user-debts/even-debts-divider";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import type { SearchParamState } from "~app/hooks/use-navigation";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import { useSubscribeToQueryUpdate } from "~app/hooks/use-subscribe-to-query";
import type { TRPCQueryInput, TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import { typeQuery } from "~app/utils/queries";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { Text } from "~components/text";
import type { DebtsId, UsersId } from "~db/models";

import { UserDebtPreview, UserDebtPreviewSkeleton } from "./user-debt-preview";

const useDebtsByIds = (debtIds: DebtsId[]) => {
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
		const getMatchedDebt = (id: DebtsId) =>
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

const useDividers = (
	debts: TRPCQueryOutput<"debts.get">[],
	aggregatedDebts: { sum: number; currencyCode: CurrencyCode }[],
) =>
	React.useMemo(() => {
		const dividersCalculations = debts.reduce<{
			sums: Partial<Record<CurrencyCode, number>>;
			resolvedCurrencies: CurrencyCode[];
			resolvedDebtIds: DebtsId[];
			dividers: Record<DebtsId, CurrencyCode>;
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
					missingCursors: new Array(currentCursor / limit)
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
		const abortController = new AbortController();
		void missingCursors.reduce(async (acc, missingCursor) => {
			await acc;
			if (abortController.signal.aborted) {
				return;
			}
			await queryClient.prefetchQuery(
				trpc.debts.getByUserPaged.queryOptions({
					...input,
					cursor: missingCursor,
				}),
			);
		}, Promise.resolve());
		return () => {
			abortController.abort();
		};
	}, [input, missingCursors, queryClient, trpc]);
	return debtIds;
};

const UserDebtsListWrapper: React.FC<React.PropsWithChildren> = ({
	children,
}) => <View className="gap-2">{children}</View>;

const UserDebtsPreviews: React.FC<{
	userId: UsersId;
	debtIds: TRPCQueryOutput<"debts.getByUserPaged">["items"];
	consecutiveDebtIds: DebtsId[];
}> = ({ userId, debtIds, consecutiveDebtIds }) => {
	const trpc = useTRPC();
	const getAllQuery = useQuery(trpc.debts.getAllUser.queryOptions({ userId }));
	const consecutiveDebts = useDebtsByIds(consecutiveDebtIds);
	const { dividers, resolvedDebtIds } = useDividers(
		consecutiveDebts,
		getAllQuery.status === "success" ? getAllQuery.data : [],
	);
	return (
		<UserDebtsListWrapper>
			{debtIds.map((debtId) => (
				<React.Fragment key={debtId}>
					{dividers[debtId] ? (
						<>
							<Divider />
							<EvenDebtsDivider currencyCode={dividers[debtId]} />
						</>
					) : null}
					<Divider />
					<UserDebtPreview
						debtId={debtId}
						resolved={resolvedDebtIds.includes(debtId)}
					/>
				</React.Fragment>
			))}
		</UserDebtsListWrapper>
	);
};

const filters = {};

export const UserDebtsList = suspendedFallback<{
	userId: UsersId;
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

		if (data.count === 0 && values(filters).filter(isNonNullish).length === 0) {
			return <Text className="text-center">{t("user.filters.empty")}</Text>;
		}

		return (
			<PaginationOverlay
				pagination={
					<PaginationBlock
						totalCount={data.count}
						limit={limit}
						setLimit={setLimit}
						offset={offsetState[0]}
						onPageChange={onPageChange}
					/>
				}
				isPending={isPending}
			>
				<UserDebtsPreviews
					userId={userId}
					debtIds={data.items}
					consecutiveDebtIds={consecutiveDebtIds}
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
			</PaginationOverlay>
		);
	},
	({ limitState }) => (
		<PaginationOverlay
			pagination={<PaginationBlockSkeleton limit={limitState[0]} />}
			isPending
		>
			<UserDebtsListWrapper>
				{Array.from({ length: limitState[0] }).map((_, index) => (
					// eslint-disable-next-line react/no-array-index-key
					<React.Fragment key={index}>
						<Divider />
						<UserDebtPreviewSkeleton />
					</React.Fragment>
				))}
			</UserDebtsListWrapper>
		</PaginationOverlay>
	),
);
