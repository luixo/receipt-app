import React from "react";
import { View } from "react-native";

import { useMutation } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { isNonNullish, values } from "remeda";

import { EmptyCard } from "~app/components/empty-card";
import {
	PaginationBlock,
	PaginationBlockSkeleton,
} from "~app/components/pagination-block";
import { PaginationOverlay } from "~app/components/pagination-overlay";
import { RemoveButton } from "~app/components/remove-button";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import type { SearchParamState } from "~app/hooks/use-navigation";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useTRPC } from "~app/utils/trpc";
import { Divider } from "~components/divider";
import { Header } from "~components/header";
import { AddIcon } from "~components/icons";
import { ButtonLink } from "~components/link";
import { Text } from "~components/text";
import type { ReceiptsId } from "~db/models";
import { options as receiptsRemoveOptions } from "~mutations/receipts/remove";

import { ReceiptPreview, ReceiptPreviewSkeleton } from "./receipt-preview";

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
	receiptIds: ReceiptsId[];
	selectedReceiptIds: ReceiptsId[];
	setSelectedReceiptIds: React.Dispatch<React.SetStateAction<ReceiptsId[]>>;
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
	filters: SearchParamState<"/receipts", "filters">[0];
	limitState: SearchParamState<"/receipts", "limit">;
	offsetState: SearchParamState<"/receipts", "offset">;
};

export const Receipts = suspendedFallback<Props>(
	({ filters, sort, limitState: [limit, setLimit], offsetState }) => {
		const { t } = useTranslation("receipts");
		const trpc = useTRPC();
		const { data, onPageChange, isPending } = useCursorPaging(
			trpc.receipts.getPaged,
			{ limit, orderBy: sort, filters },
			offsetState,
		);
		const [selectedReceiptIds, setSelectedReceiptIds] = React.useState<
			ReceiptsId[]
		>([]);

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
									<AddIcon size={24} />
								</ButtonLink>
							),
						}}
					/>
				</EmptyCard>
			);
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
						selection={{
							items: data.items,
							selectedItems: selectedReceiptIds,
							setSelectedItems: setSelectedReceiptIds,
						}}
						endContent={
							<RemoveReceiptsButton
								key={data.items.length}
								selectedReceiptIds={selectedReceiptIds}
								setSelectedReceiptIds={setSelectedReceiptIds}
								receiptIds={data.items}
							/>
						}
					/>
				}
				isPending={isPending}
			>
				<ReceiptsWrapper>
					{data.items.map((id) => (
						<ReceiptPreview
							key={id}
							id={id}
							isSelected={selectedReceiptIds.includes(id)}
							onValueChange={(nextSelected) =>
								setSelectedReceiptIds((prevSelected) =>
									nextSelected
										? [...prevSelected, id]
										: prevSelected.filter((lookupValue) => lookupValue !== id),
								)
							}
						/>
					))}
				</ReceiptsWrapper>
			</PaginationOverlay>
		);
	},
	({ limitState }) => (
		<PaginationOverlay
			pagination={<PaginationBlockSkeleton limit={limitState[0]} />}
			isPending
		>
			<ReceiptsWrapper>
				{Array.from({ length: limitState[0] }).map((_, index) => (
					// eslint-disable-next-line react/no-array-index-key
					<ReceiptPreviewSkeleton key={index} />
				))}
			</ReceiptsWrapper>
		</PaginationOverlay>
	),
);
