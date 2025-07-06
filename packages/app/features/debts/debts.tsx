import type React from "react";
import { View } from "react-native";

import { Trans, useTranslation } from "react-i18next";
import { isNonNullish, values } from "remeda";

import { EmptyCard } from "~app/components/empty-card";
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

export const DebtsSkeleton: React.FC<{ amount: number }> = ({ amount }) => (
	<View className="gap-2">
		{Array.from({ length: amount }).map((_, index) => (
			// eslint-disable-next-line react/no-array-index-key
			<UserDebtsPreviewSkeleton key={index} />
		))}
	</View>
);

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
	const { data, onPageChange, isPending } = useCursorPaging(
		trpc.debts.getUsersPaged,
		{ limit, filters: { showResolved: showResolvedDebts, ...filters } },
		offsetState,
	);

	if (!data.count) {
		if (values(filters).filter(isNonNullish).length === 0) {
			return (
				<Header className="text-center">{t("list.filters.noResults")}</Header>
			);
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
					totalCount={data.count}
					limit={limit}
					setLimit={setLimit}
					offset={offsetState[0]}
					onPageChange={onPageChange}
				/>
			}
			isPending={isPending}
		>
			<View className="gap-2">
				{data.items.map((userId) => (
					<UserDebtsPreview key={userId} userId={userId} />
				))}
			</View>
		</PaginationOverlay>
	);
};
