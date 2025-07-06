import type React from "react";
import { View } from "react-native";

import { Trans, useTranslation } from "react-i18next";
import { isNonNullish, values } from "remeda";

import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import { PaginationBlock } from "~app/components/pagination-block";
import { PaginationOverlay } from "~app/components/pagination-overlay";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import type { SearchParamState } from "~app/hooks/use-navigation";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import { useTRPC } from "~app/utils/trpc";
import { Header } from "~components/header";
import { AddIcon } from "~components/icons";
import { ButtonLink } from "~components/link";
import { Text } from "~components/text";

import {
	UserDebtsPreview,
	UserDebtsPreviewSkeleton,
} from "./user-debts-preview";

// eslint-disable-next-line jsx-a11y/heading-has-content
const bigText = <Text className="text-xl" />;

const skeletonElements = new Array<null>(5).fill(null).map((_, index) => index);

type Props = {
	limitState: SearchParamState<"/debts", "limit">;
	offsetState: SearchParamState<"/debts", "offset">;
};

export const Debts: React.FC<Props> = ({ limitState, offsetState }) => {
	const { t } = useTranslation("debts");
	const [showResolvedDebts] = useShowResolvedDebts();
	const [limit, setLimit] = limitState;
	const filters = {};
	const trpc = useTRPC();
	const { query, onPageChange, isPending } = useCursorPaging(
		trpc.debts.getUsersPaged,
		{ limit, filters: { showResolved: showResolvedDebts, ...filters } },
		offsetState,
	);

	if (
		!query.data?.count &&
		query.fetchStatus !== "fetching" &&
		query.fetchStatus !== "idle"
	) {
		if (query.status === "error") {
			return <QueryErrorMessage query={query} />;
		}
		return (
			<EmptyCard title={t("list.empty.title")}>
				<View className="items-center gap-4">
					<View className="flex-row items-center">
						<Trans
							t={t}
							i18nKey="list.empty.description"
							components={{
								text: bigText,
								button: (
									<ButtonLink
										to="/debts/add"
										color="primary"
										title={t("list.buttons.add")}
										variant="bordered"
										isIconOnly
										className="mx-2"
									>
										<AddIcon size={24} />
									</ButtonLink>
								),
							}}
						/>
					</View>
				</View>
			</EmptyCard>
		);
	}

	return (
		<PaginationOverlay
			pagination={
				<PaginationBlock
					totalCount={query.data?.count}
					limit={limit}
					setLimit={setLimit}
					offset={offsetState[0]}
					onPageChange={onPageChange}
				/>
			}
			isPending={isPending}
		>
			{query.status === "error" ? (
				<QueryErrorMessage query={query} />
			) : query.status === "pending" ? (
				<View className="gap-2">
					{skeletonElements.map((index) => (
						<UserDebtsPreviewSkeleton key={index} />
					))}
				</View>
			) : !query.data.count &&
			  values(filters).filter(isNonNullish).length === 0 ? (
				<Header className="text-center">{t("list.filters.noResults")}</Header>
			) : (
				<View className="gap-2">
					{query.data.items.map((userId) => (
						<UserDebtsPreview key={userId} userId={userId} />
					))}
				</View>
			)}
		</PaginationOverlay>
	);
};
