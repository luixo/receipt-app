import type React from "react";
import { View } from "react-native";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { isNonNullish, values } from "remeda";

import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import { PaginationBlock } from "~app/components/pagination-block";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import type { SearchParamState } from "~app/hooks/use-navigation";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import type { TRPCQueryInput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { Header } from "~components/header";
import { AddIcon } from "~components/icons";
import { ButtonLink } from "~components/link";
import { Overlay } from "~components/overlay";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";

import {
	UserDebtsPreview,
	UserDebtsPreviewSkeleton,
} from "./user-debts-preview";

type Input = TRPCQueryInput<"debts.getUsersPaged">;
const useDebtsQuery = (
	input: Omit<Input, "cursor">,
	cursor: Input["cursor"],
) => {
	const trpc = useTRPC();
	return useQuery(
		trpc.debts.getUsersPaged.queryOptions(
			{ ...input, cursor },
			{ placeholderData: keepPreviousData },
		),
	);
};

const skeletonElements = new Array<null>(5).fill(null).map((_, index) => index);

type Props = {
	limitState: SearchParamState<"/debts", "limit">;
	offsetState: SearchParamState<"/debts", "offset">;
};

export const Debts: React.FC<Props> = ({ limitState, offsetState }) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	const [limit, setLimit] = limitState;
	const filters = {};
	const { totalCount, query, pagination } = useCursorPaging(
		useDebtsQuery,
		{
			limit,
			filters: { showResolved: showResolvedDebts, ...filters },
		},
		offsetState,
	);

	if (
		!totalCount &&
		query.fetchStatus !== "fetching" &&
		query.fetchStatus !== "idle"
	) {
		if (query.status === "error") {
			return <QueryErrorMessage query={query} />;
		}
		return (
			<EmptyCard title="You have no debts">
				<View className="items-center gap-4">
					<View className="flex-row items-center">
						<Text className="text-xl">Press</Text>
						<ButtonLink
							to="/debts/add"
							color="primary"
							title="Add debt"
							variant="bordered"
							isIconOnly
							className="mx-2"
						>
							<AddIcon size={24} />
						</ButtonLink>
						<Text className="text-xl">to add a debt</Text>
					</View>
				</View>
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
				{query.status === "error" ? (
					<QueryErrorMessage query={query} />
				) : query.status === "pending" ? (
					<View className="gap-2">
						{skeletonElements.map((index) => (
							<UserDebtsPreviewSkeleton key={index} />
						))}
					</View>
				) : !totalCount && values(filters).filter(isNonNullish).length === 0 ? (
					<Header className="text-center">No debts under given filters</Header>
				) : (
					<View className="gap-2">
						{query.data.items.map((userId) => (
							<UserDebtsPreview key={userId} userId={userId} />
						))}
					</View>
				)}
			</Overlay>
			{paginationElement}
		</>
	);
};
