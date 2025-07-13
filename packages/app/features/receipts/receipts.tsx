import React from "react";
import { View } from "react-native";

import { useQueries } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { isNonNullish, values } from "remeda";

import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import {
	PaginationBlock,
	PaginationBlockSkeleton,
} from "~app/components/pagination-block";
import { PaginationOverlay } from "~app/components/pagination-overlay";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import type { SearchParamState } from "~app/hooks/use-navigation";
import type { TRPCQueryErrorResult } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { Divider } from "~components/divider";
import { Header } from "~components/header";
import { AddIcon } from "~components/icons";
import { ButtonLink } from "~components/link";
import { Text } from "~components/text";
import type { ReceiptsId } from "~db/models";

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
			<Divider className="max-sm:hidden" />
			{children}
		</>
	);
};

const ReceiptPreviews: React.FC<{ ids: ReceiptsId[] }> = ({ ids }) => {
	const trpc = useTRPC();
	const receiptQueries = useQueries({
		queries: ids.map((id) => trpc.receipts.get.queryOptions({ id })),
	});
	if (receiptQueries.every((query) => query.status === "error")) {
		return (
			<QueryErrorMessage
				query={receiptQueries[0] as TRPCQueryErrorResult<"receipts.get">}
			/>
		);
	}

	return (
		<>
			{receiptQueries.map((receiptQuery, index) => (
				<React.Fragment key={ids[index]}>
					<Divider className="sm:hidden" />
					{receiptQuery.status === "pending" ? (
						<ReceiptPreviewSkeleton />
					) : receiptQuery.status === "error" ? (
						<QueryErrorMessage query={receiptQuery} />
					) : (
						<ReceiptPreview receipt={receiptQuery.data} />
					)}
				</React.Fragment>
			))}
		</>
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
					/>
				}
				isPending={isPending}
			>
				<ReceiptsWrapper>
					<ReceiptPreviews ids={data.items} />
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
