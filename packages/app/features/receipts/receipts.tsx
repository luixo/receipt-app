import React from "react";
import { View } from "react-native";

import { useQueries } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { isNonNullish, values } from "remeda";

import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import { PaginationBlock } from "~app/components/pagination-block";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import type { SearchParamState } from "~app/hooks/use-navigation";
import type { TRPCQueryErrorResult } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { Divider } from "~components/divider";
import { Header } from "~components/header";
import { AddIcon } from "~components/icons";
import { ButtonLink } from "~components/link";
import { Overlay } from "~components/overlay";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import type { ReceiptsId } from "~db/models";

import { ReceiptPreview, ReceiptPreviewSkeleton } from "./receipt-preview";

const ReceiptPreviewsSkeleton: React.FC<{ amount: number }> = ({ amount }) => {
	const elements = React.useMemo(
		() => new Array<null>(amount).fill(null),
		[amount],
	);
	return (
		<>
			{elements.map((_, index) => (
				// eslint-disable-next-line react/no-array-index-key
				<ReceiptPreviewSkeleton key={index} />
			))}
		</>
	);
};

const ReceiptPreviews: React.FC<{ ids: ReceiptsId[] }> = ({ ids }) => {
	const trpc = useTRPC();
	const receiptQueries = useQueries({
		queries: ids.map((id) => trpc.receipts.get.queryOptions({ id })),
	});
	if (receiptQueries.every((query) => query.status === "pending")) {
		return <ReceiptPreviewsSkeleton amount={receiptQueries.length} />;
	}
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

const ReceiptsTableHeader = () => {
	const { t } = useTranslation("receipts");
	return (
		<View className="flex-row gap-2">
			<View className="flex-[8] p-2">
				<Text>{t("list.table.receipt")}</Text>
			</View>
			<View className="flex-[2] p-2">
				<Text className="self-end">{t("list.table.sum")}</Text>
			</View>
			<View className="flex-1 p-2 max-sm:hidden" />
		</View>
	);
};

type Props = {
	sort: SearchParamState<"/receipts", "sort">[0];
	filters: SearchParamState<"/receipts", "filters">[0];
	limitState: SearchParamState<"/receipts", "limit">;
	offsetState: SearchParamState<"/receipts", "offset">;
};

export const Receipts: React.FC<Props> = ({
	filters,
	sort,
	limitState: [limit, setLimit],
	offsetState,
}) => {
	const { t } = useTranslation("receipts");
	const trpc = useTRPC();
	const { totalCount, query, pagination } = useCursorPaging(
		trpc.receipts.getPaged,
		{ limit, orderBy: sort, filters },
		offsetState,
	);

	if (!totalCount && query.fetchStatus !== "fetching") {
		if (query.status === "error") {
			return <QueryErrorMessage query={query} />;
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

	const paginationElement = (
		<PaginationBlock
			totalCount={totalCount}
			limit={limit}
			setLimit={setLimit}
			props={pagination}
		/>
	);

	return (
		<>
			{paginationElement}
			<Overlay
				className="gap-2"
				overlay={
					query.fetchStatus === "fetching" && query.isPlaceholderData ? (
						<Spinner size="lg" />
					) : undefined
				}
			>
				<ReceiptsTableHeader />
				<Divider className="max-sm:hidden" />
				{query.status === "error" ? (
					<QueryErrorMessage query={query} />
				) : query.status === "pending" ? (
					<ReceiptPreviewsSkeleton amount={limit} />
				) : !totalCount && values(filters).filter(isNonNullish).length === 0 ? (
					<Header className="text-center">{t("list.noResults")}</Header>
				) : (
					<ReceiptPreviews ids={query.data.items} />
				)}
			</Overlay>
			{paginationElement}
		</>
	);
};
