import React from "react";
import { View } from "react-native";

import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useMutation } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { isNonNullish, values } from "remeda";

import { EmptyCard } from "~app/components/empty-card";
import {
	PaginationBlock,
	PaginationBlockSkeleton,
} from "~app/components/pagination-block";
import { SuspendedOverlay } from "~app/components/pagination-overlay";
import { RemoveButton } from "~app/components/remove-button";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { SearchParamState } from "~app/utils/navigation";
import { useTRPC } from "~app/utils/trpc";
import { Divider } from "~components/divider";
import { Header } from "~components/header";
import { Icon } from "~components/icons";
import { ButtonLink } from "~components/link";
import { Text } from "~components/text";
import type { ReceiptId } from "~db/ids";
import { options as receiptsRemoveOptions } from "~mutations/receipts/remove";

import { ReceiptPreview, ReceiptPreviewSkeleton } from "./receipt-preview";

const SEARCH_UPDATE_DEBOUNCE = 1000;

const ReceiptsWrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
	const { t } = useTranslation("receipts");
	return (
		<>
			<View className="flex-row gap-2">
				<View className="flex-[8] p-2">
					<Text>{t("list.table.receipt")}</Text>
				</View>
				<View className="flex-[2] p-2">
					<Text className="self-end">{t("list.table.sum")}</Text>
				</View>
				<View className="flex-1 p-2 max-sm:hidden" />
			</View>
			<Divider />
			<View>{children}</View>
		</>
	);
};

const RemoveReceiptsButton: React.FC<{
	receiptIds: ReceiptId[];
	selectedReceiptIds: ReceiptId[];
	setSelectedReceiptIds: React.Dispatch<React.SetStateAction<ReceiptId[]>>;
}> = ({ selectedReceiptIds, setSelectedReceiptIds, receiptIds }) => {
	const trpc = useTRPC();
	const removeMutations = receiptIds.map((receiptId) => ({
		receiptId,
		// Mutations are stable due to `key` based on limit in the parent component
		// eslint-disable-next-line react-hooks/rules-of-hooks
		mutation: useMutation(
			trpc.receipts.remove.mutationOptions(
				// eslint-disable-next-line react-hooks/rules-of-hooks
				useTrpcMutationOptions(receiptsRemoveOptions),
			),
		),
	}));
	const onRemoveSelected = React.useCallback(() => {
		removeMutations.forEach(({ receiptId, mutation }) => {
			if (!selectedReceiptIds.includes(receiptId)) {
				return;
			}
			mutation.mutate(
				{ id: receiptId },
				{
					onSuccess: () =>
						setSelectedReceiptIds((prevReceiptIds) =>
							prevReceiptIds.filter((lookupId) => lookupId !== receiptId),
						),
				},
			);
		});
	}, [removeMutations, selectedReceiptIds, setSelectedReceiptIds]);
	return (
		<RemoveButton
			onRemove={onRemoveSelected}
			mutation={{
				isPending: removeMutations.some(({ mutation }) => mutation.isPending),
			}}
			isIconOnly
			isDisabled={selectedReceiptIds.length === 0}
			noConfirm={selectedReceiptIds.length < 2}
		/>
	);
};

type Props = {
	sort: SearchParamState<"/receipts", "sort">[0];
	filtersState: SearchParamState<"/receipts", "filters">;
	limitState: SearchParamState<"/receipts", "limit">;
	offsetState: SearchParamState<"/receipts", "offset">;
};

export const Receipts = suspendedFallback<Props>(
	({ filtersState, sort, limitState: [limit, setLimit], offsetState }) => {
		const { t } = useTranslation("receipts");
		const trpc = useTRPC();
		const [filters, setFilters] = filtersState;
		const updateFiltersQuery = React.useCallback(
			(nextValue: string) =>
				setFilters((prev) => ({ ...prev, query: nextValue })),
			[setFilters],
		);
		const debounceUpdateFiltersQuery = useDebouncedCallback(
			updateFiltersQuery,
			{ wait: SEARCH_UPDATE_DEBOUNCE },
		);
		const { data, onPageChange, isPending } = useCursorPaging(
			trpc.receipts.getPaged,
			{ limit, orderBy: sort, filters },
			offsetState,
		);
		const [selectedReceiptIds, setSelectedReceiptIds] = React.useState<
			ReceiptId[]
		>([]);
		const receiptIds = React.useMemo(
			() => data.items.map(({ id }) => id),
			[data.items],
		);

		if (!data.count) {
			if (values(filters).filter(isNonNullish).length === 0) {
				return <Header className="text-center">{t("list.noResults")}</Header>;
			}
			return (
				<EmptyCard title={t("list.empty.title")}>
					<Trans
						t={t}
						i18nKey="list.empty.message"
						components={{
							icon: (
								<ButtonLink
									color="primary"
									to="/receipts/add"
									title={t("list.addButton")}
									variant="bordered"
									className="mx-2"
									isIconOnly
								>
									<Icon name="add" className="size-6" />
								</ButtonLink>
							),
						}}
					/>
				</EmptyCard>
			);
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
						items: receiptIds,
						selectedItems: selectedReceiptIds,
						setSelectedItems: setSelectedReceiptIds,
					}}
					search={{
						onValueChange: debounceUpdateFiltersQuery,
						value: filters.query ?? "",
					}}
					endContent={
						<RemoveReceiptsButton
							key={data.items.length}
							selectedReceiptIds={selectedReceiptIds}
							setSelectedReceiptIds={setSelectedReceiptIds}
							receiptIds={receiptIds}
						/>
					}
				/>
				<SuspendedOverlay isPending={isPending}>
					<ReceiptsWrapper>
						{data.items.map(({ id, highlights, matchedItems }) => (
							<ReceiptPreview
								key={id}
								id={id}
								highlights={highlights}
								filterQuery={filters.query || ""}
								matchedItems={matchedItems}
								isSelected={selectedReceiptIds.includes(id)}
								onValueChange={(nextSelected) =>
									setSelectedReceiptIds((prevSelected) =>
										nextSelected
											? [...prevSelected, id]
											: prevSelected.filter(
													(lookupValue) => lookupValue !== id,
												),
									)
								}
							/>
						))}
					</ReceiptsWrapper>
				</SuspendedOverlay>
			</>
		);
	},
	({ limitState }) => (
		<>
			<PaginationBlockSkeleton limit={limitState[0]} />
			<SuspendedOverlay isPending>
				<ReceiptsWrapper>
					{Array.from({ length: limitState[0] }).map((_, index) => (
						// eslint-disable-next-line react/no-array-index-key
						<ReceiptPreviewSkeleton key={index} />
					))}
				</ReceiptsWrapper>
			</SuspendedOverlay>
		</>
	),
);
